"""
AI 工具箱 — 统一后端 (端口 8000)
整合：GPT Image + 提示词生成 + 文案生成 + 图像识别
启动: python server.py
"""
import sys, os, re, time, base64, json, glob, threading, asyncio, random

_HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, _HERE)

# ═══ 统一模型配置 ═══
from model_config import (
    GPT_IMAGE, TISHICI_MODELS, WENAN, TUPIAN,
    MAX_FILE_SIZE, ALLOWED_EXTENSIONS, MAX_BATCH_SIZE, MAX_CONCURRENCY
)

# ═══ 导入 tishici 模块 (本地) — 必须先于 tupian，避免 database 模块冲突 ═══
sys.path.insert(0, os.path.join(_HERE, "modules", "tishici"))
from ai_client import (
    AIClient, MODELS, SCENE_OPTIONS, AUDIENCE_OPTIONS,
    WEATHER_OPTIONS, STYLE_OPTIONS, ACTION_OPTIONS, random_person
)
# tishici 的 database.py 注册为 'database'，用完后清除缓存
import database as _tishici_db
PromptDatabase = _tishici_db.PromptDatabase
SimilarityChecker = _tishici_db.SimilarityChecker
del _tishici_db
if 'database' in sys.modules: del sys.modules['database']

# ═══ 导入 tupian 模块 (本地) ═══
sys.path.insert(0, os.path.join(_HERE, "modules", "tupian"))
from database.db import init_db, save_record, get_all_records, get_record, delete_record
from services.recognize import recognize_by_url, recognize_by_upload_data, RecognizeError

# ═══ 导入 wenan 模块 (本地) ═══
sys.path.insert(0, os.path.join(_HERE, "modules", "wenan"))
from generator import generate_batch, COPY_TYPES

# ═══ FastAPI App ═══
from fastapi import FastAPI, HTTPException, UploadFile, File, Query, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse, Response
from fastapi.security import APIKeyHeader
from pydantic import BaseModel
from typing import Optional, List
from contextlib import asynccontextmanager
from pathlib import Path

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    try: from openai import OpenAI; OpenAI(base_url=TUPIAN["base_url"], api_key=TUPIAN["api_key"])
    except: pass
    yield

app = FastAPI(title="AI工具箱", version="4.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

# ═══ Static files ═══
STATIC_DIR = os.path.join(_HERE, "static")
if os.path.exists(STATIC_DIR):
    app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

# ═══ GPT Image config ═══
@app.get("/api/gpt-image/config")
async def gpt_image_config():
    return {
        "default_api_key": GPT_IMAGE["default_api_key"],
        "base_url": GPT_IMAGE["base_url"],
        "generate_endpoint": GPT_IMAGE["generate_endpoint"],
        "edit_endpoint": GPT_IMAGE["edit_endpoint"],
    }

# ═══ API Key verification ═══
APP_API_KEY = TUPIAN["app_api_key"]
_api_key_header = APIKeyHeader(name="X-App-Key", auto_error=False)

async def verify_key(x_app_key: str = Depends(_api_key_header)):
    if APP_API_KEY and (not x_app_key or x_app_key != APP_API_KEY):
        raise HTTPException(401, "Invalid X-App-Key")

# ═══════════════════════════════════════════
# 图像识别 API (/api/image/*)
# ═══════════════════════════════════════════
_batch_semaphore = asyncio.Semaphore(MAX_CONCURRENCY)

def _sanitize_url(url):
    from urllib.parse import urlparse, urlunparse
    p = urlparse(url)
    return urlunparse((p.scheme, p.netloc, p.path, "", "", ""))

def _validate_upload(filename, size):
    if Path(filename).suffix.lower() not in ALLOWED_EXTENSIONS:
        raise HTTPException(400, f"不支持格式: {Path(filename).suffix}")
    if size and size > MAX_FILE_SIZE:
        raise HTTPException(413, "文件超过10MB限制")

async def _read_upload(file):
    chunks, total = [], 0
    while True:
        chunk = await file.read(1024*1024)
        if not chunk: break
        total += len(chunk)
        if total > MAX_FILE_SIZE: raise HTTPException(413, "文件超过10MB限制")
        chunks.append(chunk)
    return b"".join(chunks)

class RecognizeUrlReq(BaseModel): url: str
class BatchRecognizeReq(BaseModel): images: List[str]

@app.get("/api/image/config")
async def img_config(): return {"app_api_key": APP_API_KEY, "version": "1.0"}

@app.get("/api/image/health")
async def img_health():
    try:
        from openai import OpenAI
        c = OpenAI(base_url=TUPIAN["base_url"], api_key=TUPIAN["api_key"])
        c.chat.completions.create(model=TUPIAN["model"], messages=[{"role":"user","content":"hi"}], max_tokens=5)
        return {"status":"ok","model":TUPIAN["model"]}
    except Exception as e:
        return JSONResponse({"status":"error","detail":str(e)}, 502)

@app.post("/api/image/recognize/url")
async def img_url(req: RecognizeUrlReq):
    try:
        result = await recognize_by_url(str(req.url))
        rid = save_record(image_source=str(req.url), result=result, image_thumb=str(req.url))
        return {"success":True,"id":rid,"result":result}
    except RecognizeError as e:
        raise HTTPException(e.status_code or 400, e.message)

@app.post("/api/image/recognize/upload")
async def img_upload(file: UploadFile = File(...)):
    fn = file.filename or "unknown"
    _validate_upload(fn, None)
    contents = await _read_upload(file)
    _validate_upload(fn, len(contents))
    try:
        result = await recognize_by_upload_data(contents, fn)
        suffix = Path(fn).suffix.lower()
        mime = "image/jpeg" if suffix in (".jpg",".jpeg") else "image/png"
        thumb = f"data:{mime};base64,{base64.b64encode(contents).decode()}"
        rid = save_record(image_source=fn, result=result, image_thumb=thumb)
        return {"success":True,"id":rid,"result":result,"thumb":thumb}
    except RecognizeError as e:
        raise HTTPException(e.status_code or 400, e.message)

@app.post("/api/image/recognize/batch")
async def img_batch(req: BatchRecognizeReq):
    async def one(url, i):
        async with _batch_semaphore:
            try:
                r = await recognize_by_url(url)
                save_record(image_source=url, result=r, image_thumb=url)
                return {"url":url,"success":True,"result":r}
            except RecognizeError as e:
                return {"url":url,"success":False,"error":e.message}
    results = await asyncio.gather(*[one(u, i) for i, u in enumerate(req.images)])
    sc = sum(1 for r in results if r["success"])
    return {"total":len(req.images),"success":sc,"failed":len(req.images)-sc,"results":results}

@app.post("/api/image/recognize/batch/upload")
async def img_batch_upload(files: list[UploadFile] = File(...)):
    if len(files) > MAX_BATCH_SIZE: raise HTTPException(400, f"最多{MAX_BATCH_SIZE}张")
    async def one(file, i):
        fn = file.filename or "unknown"
        async with _batch_semaphore:
            try:
                c = await _read_upload(file)
                _validate_upload(fn, len(c))
                r = await recognize_by_upload_data(c, fn)
                save_record(image_source=fn, result=r)
                return {"filename":fn,"success":True,"result":r}
            except Exception as e:
                return {"filename":fn,"success":False,"error":str(e)}
    results = await asyncio.gather(*[one(f, i) for i, f in enumerate(files)])
    sc = sum(1 for r in results if r["success"])
    return {"total":len(files),"success":sc,"failed":len(files)-sc,"results":results}

@app.get("/api/image/history", dependencies=[Depends(verify_key)])
async def img_history(page:int=Query(1,ge=1), page_size:int=Query(20,ge=1,le=100)):
    items, total = get_all_records(page=page, page_size=page_size)
    return {"items":items,"total":total,"page":page,"page_size":page_size}

@app.get("/api/image/history/{rid}", dependencies=[Depends(verify_key)])
async def img_history_item(rid:int):
    r = get_record(rid)
    if not r: raise HTTPException(404)
    return r

@app.delete("/api/image/history/{rid}", dependencies=[Depends(verify_key)])
async def img_delete(rid:int):
    if not delete_record(rid): raise HTTPException(404)
    return {"success":True}

# ═══════════════════════════════════════════
# 提示词生成 API (/api/prompt/*)
# ═══════════════════════════════════════════
prompt_db = PromptDatabase()
checker = SimilarityChecker()
ai_client = AIClient("main")
_pgen_state = {"running":False,"progress":0,"total":0,"message":"","start_time":0}

class PromptGenReq(BaseModel):
    model:str="main"; audience:str="默认随机(按画像比例55/15/30)"; scene:str="随机"
    weather:str="随机"; style:str="随机"; action:str="随机"
    min_product:int=1; max_product:int=3; batch:int=1; tolerance:float=65.0; extra:str=""

@app.get("/api/prompt/config")
async def prompt_config():
    return {
        "current_model":ai_client.model_key,"current_model_name":ai_client.get_model_name(),
        "available_models":{k:v["name"] for k,v in MODELS.items()},
        "scene_options":SCENE_OPTIONS,"weather_options":WEATHER_OPTIONS,
        "style_options":STYLE_OPTIONS,"action_options":ACTION_OPTIONS,
        "audience_options":AUDIENCE_OPTIONS,"generating":_pgen_state["running"],
    }

@app.post("/api/prompt/generate")
async def prompt_start(req:PromptGenReq):
    global _pgen_state
    if _pgen_state["running"]: raise HTTPException(400,"已有任务在运行")
    _pgen_state={"running":True,"progress":0,"total":req.batch,"message":"准备中...","start_time":time.time()}
    threading.Thread(target=_run_prompt_gen,args=(req,),daemon=True).start()
    return {"success":True}

@app.post("/api/prompt/stop")
async def prompt_stop():
    global _pgen_state; _pgen_state["running"]=False; return {"success":True}

@app.get("/api/prompt/status")
async def prompt_status():
    e=time.time()-_pgen_state["start_time"] if _pgen_state["start_time"] else 0
    return {"running":_pgen_state["running"],"progress":_pgen_state["progress"],
            "total":_pgen_state["total"],"message":_pgen_state["message"],"elapsed":round(e)}

@app.get("/api/prompt/history")
async def prompt_history(page:int=Query(1),page_size:int=Query(50),sort:str=Query("latest"),search:str=Query("")):
    order="copy_count DESC" if sort=="most_copied" else "id DESC"
    rows=prompt_db.search_prompts(search) if search else prompt_db.get_all_prompts(order_by=order)
    total=len(rows); start=(page-1)*page_size; page_rows=rows[start:start+page_size]
    items=[{"id":pid,"prompt":t,"created_at":str(ca),"params":ps,"copy_count":cc or 0} for pid,t,ca,ps,cc in page_rows]
    return {"items":items,"total":total,"total_copies":prompt_db.count_total_copies(),"page":page}

@app.get("/api/prompt/history/{pid}")
async def prompt_history_item(pid:int):
    r=prompt_db.get_prompt_by_id(pid)
    if not r: raise HTTPException(404)
    return {"id":pid,"prompt":r[0],"copy_count":r[1]}

@app.delete("/api/prompt/history/{pid}")
async def prompt_delete(pid:int): prompt_db.delete_prompt(pid); return {"success":True}

@app.post("/api/prompt/history/batch-delete")
async def prompt_batch_delete(req:dict):
    ids=req.get("ids",[]); prompt_db.delete_prompts_batch(ids); return {"success":True}

@app.post("/api/prompt/history/{pid}/copy")
async def prompt_copy(pid:int): prompt_db.increment_copy_count(pid); return {"success":True}

def _run_prompt_gen(req:PromptGenReq):
    global _pgen_state
    try:
        existing=[row[1] for row in prompt_db.get_all_prompts()]
        tolerance=req.tolerance/100.0; sc=0
        audience_key=req.audience
        param_str=f"人群:{audience_key}|场景:{req.scene}|天气:{req.weather}|动作:{req.action}"
        for i in range(req.batch):
            if not _pgen_state["running"]: break
            _pgen_state["progress"]=i; _pgen_state["message"]=f"生成第{i+1}/{req.batch}批..."
            person=random_person(audience_key)
            scene=random.choice(SCENE_OPTIONS) if req.scene=="随机" else req.scene
            weather=random.choice(WEATHER_OPTIONS) if req.weather=="随机" else req.weather
            style=random.choice(STYLE_OPTIONS) if req.style=="随机" else req.style
            action=random.choice(ACTION_OPTIONS) if req.action=="随机" else req.action
            extra=req.extra.strip()
            if extra in ["无特殊要求，让AI自由发挥","无特殊要求",""]: extra=""
            params={"scene":scene,"person":person,"audience":audience_key,"weather":weather,
                    "style":style,"action":action,"count":4,"min_product":req.min_product,
                    "max_product":req.max_product,"extra":extra}
            ok=False
            for attempt in range(5):
                if not _pgen_state["running"]: break
                try:
                    temp=round(0.80+min(attempt*0.025,0.15),2)
                    result=ai_client.generate_prompt(params,temperature=temp,seed=random.randint(1,99999))
                    if not result: time.sleep(0.3); continue
                    ms,_=checker.find_max_similarity(result,existing)
                    if ms>=tolerance:
                        if attempt>=2: params["scene"]=random.choice(SCENE_OPTIONS); params["action"]=random.choice(ACTION_OPTIONS)
                        time.sleep(0.2); continue
                    prompt_db.add_prompt(result,param_str)
                    existing.append(result); sc+=1
                    _pgen_state["message"]=f"✅ 第{i+1}批完成 (相似度{ms:.0%})"
                    ok=True; break
                except Exception as e: _pgen_state["message"]=f"⚠️ {str(e)[:60]}，重试..."; time.sleep(1)
            if not ok: _pgen_state["message"]=f"⚠️ 第{i+1}批跳过"
        _pgen_state["progress"]=req.batch
        _pgen_state["message"]=f"✅ 完成！成功{sc}/{req.batch}批={sc*4}张"
    except Exception as e: _pgen_state["message"]=f"❌ {str(e)}"
    finally: _pgen_state["running"]=False

# ═══════════════════════════════════════════
# 文案生成 API (/api/copy/*)
# ═══════════════════════════════════════════
_cgen_state={"running":False,"progress":0,"total":0,"message":"","result":None,"start_time":0}
_cancel_event: Optional[threading.Event] = None

class CopyGenReq(BaseModel):
    copy_type:str="朋友圈/社群"; count:int=10; workers:int=5; custom_topic:str=""; custom_style:str=""

@app.get("/api/copy/types")
async def copy_types(): return {"types":{k:v["label"] for k,v in COPY_TYPES.items()}}

@app.get("/api/copy/health")
async def copy_health(): return {"status":"ok"}

@app.post("/api/copy/generate")
async def copy_start(req:CopyGenReq):
    global _cgen_state, _cancel_event
    if _cgen_state["running"]: raise HTTPException(400,"已有任务在运行")
    if req.copy_type not in COPY_TYPES: raise HTTPException(400,f"未知类型:{req.copy_type}")
    _cancel_event=threading.Event()
    _cgen_state={"running":True,"progress":0,"total":req.count,"message":"准备中...","result":None,"start_time":time.time(),
                 "accepted":0,"failed_count":0,"dup":0,"issue":0,"copy_type":req.copy_type}
    def cb(cur,tot,acc,fail,dup,issue):
        _cgen_state["progress"]=cur; _cgen_state["accepted"]=acc; _cgen_state["failed_count"]=fail
        _cgen_state["dup"]=dup; _cgen_state["issue"]=issue
        e=time.time()-_cgen_state["start_time"]; eta=(e/cur*(tot-cur)) if cur else 0
        _cgen_state["message"]=f"⏳ {cur}/{tot} · ✅{acc} · ❌{fail} · ⏱≈{eta:.0f}s"
    def worker():
        global _cgen_state, _cancel_event
        try:
            r=generate_batch(req.copy_type,req.count,req.custom_style,req.custom_topic,cb,req.workers,_cancel_event)
            _cgen_state["result"]=r
            e=time.time()-_cgen_state["start_time"]
            cn=" (已取消)" if r.get("cancelled") else ""
            _cgen_state["message"]=f"{'⏹' if r.get('cancelled') else '✅'} 完成{cn}：accepted {r['accepted_count']}/{r['total_count']} · 耗时{e:.0f}s"
        except Exception as e: _cgen_state["message"]=f"❌ {str(e)}"
        finally: _cgen_state["running"]=False; _cancel_event=None
    threading.Thread(target=worker,daemon=True).start()
    return {"success":True}

@app.post("/api/copy/stop")
async def copy_stop():
    global _cancel_event
    if _cancel_event: _cancel_event.set()
    _cgen_state["running"]=False; return {"success":True}

@app.get("/api/copy/status")
async def copy_status():
    e=time.time()-_cgen_state["start_time"] if _cgen_state["start_time"] else 0
    return {"running":_cgen_state["running"],"progress":_cgen_state["progress"],"total":_cgen_state["total"],
            "message":_cgen_state["message"],"elapsed":round(e),"accepted":_cgen_state.get("accepted",0),
            "failed_count":_cgen_state.get("failed_count",0),"dup":_cgen_state.get("dup",0),"issue":_cgen_state.get("issue",0)}

@app.get("/api/copy/result")
async def copy_result():
    if _cgen_state["running"]: raise HTTPException(400,"仍在生成中")
    if not _cgen_state["result"]: raise HTTPException(404,"无结果")
    r=_cgen_state["result"]; e=time.time()-_cgen_state["start_time"] if _cgen_state["start_time"] else 0
    return {"results":r["results"][:50],"total_count":r["total_count"],"accepted_count":r["accepted_count"],
            "failed":r.get("failed",[]),"avg_similarity":r["avg_similarity"],"max_similarity":r["max_similarity"],
            "dup_rewrites":r["dup_rewrites"],"issue_rewrites":r["issue_rewrites"],
            "cancelled":r.get("cancelled",False),"job_file":r.get("job_file"),"gen_time":round(e,1)}

OUTPUT_DIR = os.path.join(_HERE, "modules", "wenan", "outputs")

@app.get("/api/copy/jobs")
async def copy_jobs():
    jobs=[]
    for csv_path in sorted(glob.glob(os.path.join(OUTPUT_DIR,"job_*.csv")),reverse=True):
        p=csv_path[:-4]; jl=p+".jsonl"; bn=os.path.basename(p); ts=bn[4:]
        st={"total":0,"accepted":0,"failed":0,"cancelled":0}
        if os.path.exists(jl):
            try:
                with open(jl,encoding="utf-8") as f:
                    for line in f:
                        if not line.strip(): continue
                        e=json.loads(line); st["total"]+=1
                        s=e.get("status",""); st[s]=st.get(s,0)+1
            except: pass
        jobs.append({"prefix":bn,"ts":ts,"label":f"📁 {ts[:8]} {ts[9:15]}","stats":st})
    return {"jobs":jobs}

@app.get("/api/copy/jobs/{prefix}/csv")
async def copy_dl_csv(prefix:str):
    p=os.path.join(OUTPUT_DIR,f"{prefix}.csv")
    if not os.path.exists(p): raise HTTPException(404)
    return Response(content=open(p,"rb").read(),media_type="text/csv",
                    headers={"Content-Disposition":f"attachment; filename={os.path.basename(p)}"})

@app.get("/api/copy/jobs/{prefix}/jsonl")
async def copy_dl_jsonl(prefix:str):
    p=os.path.join(OUTPUT_DIR,f"{prefix}.jsonl")
    if not os.path.exists(p): raise HTTPException(404)
    return Response(content=open(p,"rb").read(),media_type="application/x-ndjson",
                    headers={"Content-Disposition":f"attachment; filename={os.path.basename(p)}"})

@app.get("/api/health")
async def health(): return {"status":"ok","services":["gpt-image","image","prompt","copy"]}

# ═══ Root — serve index.html ═══
@app.get("/")
async def index(): return FileResponse(os.path.join(_HERE, "index.html"))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
