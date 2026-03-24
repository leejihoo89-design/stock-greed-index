# auto_trade_gui.py
import os
import sys
import io
import time
import json
import signal
import threading
import datetime
import traceback
import subprocess
import tkinter as tk
from tkinter import ttk, filedialog, scrolledtext, messagebox

# ============================================================
# 설정 파일 경로 (같은 폴더에 config.json 저장)
# ============================================================
CONFIG_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "config.json")

DEFAULT_CONFIG = {
    "spreadsheet_name": "",
    "worksheet_name": "user1",
    "secret_key_path": "",
    "kiwoom_exe_path": r"C:\KiwoomGlobal\bin\nfstarter.exe",
    "simple_auth_pin": "",
    "log_dir": r"C:\logs",
    "telegram_token": "",
    "telegram_chat_id": "",
}

def load_config():
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                cfg = json.load(f)
                for k, v in DEFAULT_CONFIG.items():
                    cfg.setdefault(k, v)
                return cfg
        except Exception:
            pass
    return DEFAULT_CONFIG.copy()

def save_config(cfg):
    with open(CONFIG_FILE, "w", encoding="utf-8") as f:
        json.dump(cfg, f, ensure_ascii=False, indent=2)

# ============================================================
# GUI 앱
# ============================================================
class AutoTradeApp:
    def __init__(self, root):
        self.root = root
        self.root.title("영웅문 자동매매 프로그램")
        self.root.geometry("900x700")
        self.root.resizable(True, True)
        self.root.configure(bg="#1e1e2e")

        self.cfg = load_config()
        self.running = False
        self.trade_thread = None

        self._build_ui()

    # ----------------------------------------------------------
    # UI 구성
    # ----------------------------------------------------------
    def _build_ui(self):
        style = ttk.Style()
        style.theme_use("clam")
        style.configure("TNotebook", background="#1e1e2e", borderwidth=0)
        style.configure("TNotebook.Tab", background="#313244", foreground="#cdd6f4",
                        padding=[12, 6], font=("Malgun Gothic", 10))
        style.map("TNotebook.Tab", background=[("selected", "#89b4fa")],
                  foreground=[("selected", "#1e1e2e")])
        style.configure("TFrame", background="#1e1e2e")
        style.configure("TLabel", background="#1e1e2e", foreground="#cdd6f4",
                        font=("Malgun Gothic", 10))
        style.configure("TEntry", fieldbackground="#313244", foreground="#cdd6f4",
                        insertcolor="#cdd6f4")
        style.configure("TButton", background="#89b4fa", foreground="#1e1e2e",
                        font=("Malgun Gothic", 10, "bold"), padding=[10, 6])
        style.map("TButton", background=[("active", "#74c7ec")])

        # 상단 타이틀
        title_frame = tk.Frame(self.root, bg="#181825", pady=8)
        title_frame.pack(fill="x")
        tk.Label(title_frame, text="🤖 영웅문 자동매매", bg="#181825",
                 fg="#89b4fa", font=("Malgun Gothic", 16, "bold")).pack()
        tk.Label(title_frame, text="Google Sheets 연동 LOC 주문 자동화",
                 bg="#181825", fg="#6c7086", font=("Malgun Gothic", 9)).pack()

        # 탭
        notebook = ttk.Notebook(self.root)
        notebook.pack(fill="both", expand=True, padx=10, pady=(5, 0))

        # 탭1: 설정
        self.tab_config = ttk.Frame(notebook)
        notebook.add(self.tab_config, text="⚙️  설정")
        self._build_config_tab()

        # 탭2: 실행/로그
        self.tab_run = ttk.Frame(notebook)
        notebook.add(self.tab_run, text="▶  실행 / 로그")
        self._build_run_tab()

        # 하단 상태바
        self.status_var = tk.StringVar(value="⏹ 대기 중")
        status_bar = tk.Label(self.root, textvariable=self.status_var,
                               bg="#181825", fg="#a6e3a1",
                               font=("Malgun Gothic", 9), anchor="w", padx=10)
        status_bar.pack(fill="x", side="bottom")

    def _section(self, parent, title):
        frame = tk.LabelFrame(parent, text=f"  {title}  ",
                               bg="#1e1e2e", fg="#89b4fa",
                               font=("Malgun Gothic", 10, "bold"),
                               bd=1, relief="groove", padx=10, pady=8)
        frame.pack(fill="x", padx=10, pady=5)
        return frame

    def _row(self, parent, label, var_name, show="", browse=None):
        row = tk.Frame(parent, bg="#1e1e2e")
        row.pack(fill="x", pady=3)
        tk.Label(row, text=label, width=22, anchor="w",
                 bg="#1e1e2e", fg="#cdd6f4",
                 font=("Malgun Gothic", 10)).pack(side="left")

        entry_var = tk.StringVar(value=self.cfg.get(var_name, ""))
        setattr(self, f"var_{var_name}", entry_var)

        entry = ttk.Entry(row, textvariable=entry_var, show=show, width=45)
        entry.pack(side="left", padx=(0, 5))

        if browse:
            ttk.Button(row, text="찾기", width=5,
                       command=lambda: self._browse(entry_var, browse)
                       ).pack(side="left")
        return entry_var

    def _browse(self, var, mode):
        if mode == "file":
            path = filedialog.askopenfilename(
                filetypes=[("JSON", "*.json"), ("All", "*.*")])
        else:
            path = filedialog.askdirectory()
        if path:
            var.set(path)

    def _build_config_tab(self):
        canvas = tk.Canvas(self.tab_config, bg="#1e1e2e", highlightthickness=0)
        scrollbar = ttk.Scrollbar(self.tab_config, orient="vertical",
                                   command=canvas.yview)
        scroll_frame = tk.Frame(canvas, bg="#1e1e2e")
        scroll_frame.bind("<Configure>",
            lambda e: canvas.configure(scrollregion=canvas.bbox("all")))
        canvas.create_window((0, 0), window=scroll_frame, anchor="nw")
        canvas.configure(yscrollcommand=scrollbar.set)
        canvas.pack(side="left", fill="both", expand=True)
        scrollbar.pack(side="right", fill="y")

        # Google Sheets 설정
        gs = self._section(scroll_frame, "📊 Google Sheets 설정")
        self._row(gs, "스프레드시트 이름", "spreadsheet_name")
        self._row(gs, "워크시트 이름", "worksheet_name")
        self._row(gs, "Secret Key 경로 (.json)", "secret_key_path", browse="file")

        # 영웅문 설정
        hw = self._section(scroll_frame, "📈 영웅문 설정")
        self._row(hw, "영웅문 실행 파일 경로", "kiwoom_exe_path", browse="file")
        self._row(hw, "간편인증 PIN", "simple_auth_pin", show="*")

        # 텔레그램 설정
        tg = self._section(scroll_frame, "💬 텔레그램 설정 (선택)")
        self._row(tg, "Bot Token", "telegram_token")
        self._row(tg, "Chat ID", "telegram_chat_id")

        # 로그 설정
        lg = self._section(scroll_frame, "📁 로그 설정")
        self._row(lg, "로그 저장 폴더", "log_dir", browse="dir")

        # 저장 버튼
        btn_frame = tk.Frame(scroll_frame, bg="#1e1e2e")
        btn_frame.pack(pady=15)
        ttk.Button(btn_frame, text="💾  설정 저장",
                   command=self._save_config).pack(side="left", padx=5)
        ttk.Button(btn_frame, text="🔄  초기화",
                   command=self._reset_config).pack(side="left", padx=5)

    def _build_run_tab(self):
        top = tk.Frame(self.tab_run, bg="#1e1e2e")
        top.pack(fill="x", padx=10, pady=8)

        # 주문 활성화 토글
        self.enable_order_var = tk.BooleanVar(value=False)
        order_frame = tk.Frame(top, bg="#313244", padx=10, pady=8,
                                relief="groove", bd=1)
        order_frame.pack(fill="x", pady=(0, 8))
        tk.Label(order_frame, text="실제 주문 실행",
                 bg="#313244", fg="#cdd6f4",
                 font=("Malgun Gothic", 11, "bold")).pack(side="left")
        self.order_toggle = tk.Checkbutton(
            order_frame, variable=self.enable_order_var,
            bg="#313244", fg="#f38ba8", selectcolor="#313244",
            activebackground="#313244",
            font=("Malgun Gothic", 10),
            text="  ⚠️ 활성화 (비활성 = DRY RUN)",
            command=self._toggle_order_warning)
        self.order_toggle.pack(side="left", padx=10)

        # 실행 버튼들
        btn_row = tk.Frame(top, bg="#1e1e2e")
        btn_row.pack(fill="x")

        self.start_btn = tk.Button(
            btn_row, text="▶  주문 실행", bg="#a6e3a1", fg="#1e1e2e",
            font=("Malgun Gothic", 12, "bold"), padx=20, pady=8,
            relief="flat", cursor="hand2",
            command=self._start_trading)
        self.start_btn.pack(side="left", padx=5)

        self.stop_btn = tk.Button(
            btn_row, text="⏹  중단", bg="#f38ba8", fg="#1e1e2e",
            font=("Malgun Gothic", 12, "bold"), padx=20, pady=8,
            relief="flat", cursor="hand2", state="disabled",
            command=self._stop_trading)
        self.stop_btn.pack(side="left", padx=5)

        ttk.Button(btn_row, text="🗑  로그 지우기",
                   command=self._clear_log).pack(side="right", padx=5)

        # 상태 표시
        info_frame = tk.Frame(self.tab_run, bg="#1e1e2e")
        info_frame.pack(fill="x", padx=10, pady=(0, 5))
        self.progress_var = tk.StringVar(value="")
        tk.Label(info_frame, textvariable=self.progress_var,
                 bg="#1e1e2e", fg="#fab387",
                 font=("Malgun Gothic", 10)).pack(side="left")

        # 로그창
        log_frame = tk.Frame(self.tab_run, bg="#1e1e2e")
        log_frame.pack(fill="both", expand=True, padx=10, pady=(0, 10))
        tk.Label(log_frame, text="실행 로그", bg="#1e1e2e", fg="#6c7086",
                 font=("Malgun Gothic", 9)).pack(anchor="w")
        self.log_text = scrolledtext.ScrolledText(
            log_frame, bg="#11111b", fg="#cdd6f4",
            font=("Consolas", 9), state="disabled",
            relief="flat", padx=8, pady=8)
        self.log_text.pack(fill="both", expand=True)

        # 로그 태그 색상
        self.log_text.tag_config("INFO",  foreground="#a6e3a1")
        self.log_text.tag_config("WARN",  foreground="#fab387")
        self.log_text.tag_config("ERROR", foreground="#f38ba8")
        self.log_text.tag_config("DRY",   foreground="#89dceb")
        self.log_text.tag_config("DEBUG", foreground="#6c7086")
        self.log_text.tag_config("DONE",  foreground="#89b4fa")

    # ----------------------------------------------------------
    # 이벤트 핸들러
    # ----------------------------------------------------------
    def _toggle_order_warning(self):
        if self.enable_order_var.get():
            ok = messagebox.askyesno(
                "⚠️ 실제 주문 경고",
                "실제 주문이 실행됩니다!\n\n"
                "구글시트의 주문표대로 실제 매수/매도가 진행됩니다.\n"
                "계속하시겠습니까?",
                icon="warning")
            if not ok:
                self.enable_order_var.set(False)

    def _save_config(self):
        for key in DEFAULT_CONFIG:
            var = getattr(self, f"var_{key}", None)
            if var:
                self.cfg[key] = var.get()
        save_config(self.cfg)
        messagebox.showinfo("저장 완료", "설정이 저장되었습니다.")

    def _reset_config(self):
        if messagebox.askyesno("초기화", "설정을 초기화하시겠습니까?"):
            self.cfg = DEFAULT_CONFIG.copy()
            for key in DEFAULT_CONFIG:
                var = getattr(self, f"var_{key}", None)
                if var:
                    var.set(DEFAULT_CONFIG[key])

    def _clear_log(self):
        self.log_text.configure(state="normal")
        self.log_text.delete("1.0", "end")
        self.log_text.configure(state="disabled")

    def _append_log(self, msg):
        self.log_text.configure(state="normal")
        ts = datetime.datetime.now().strftime("[%H:%M:%S]")
        line = f"{ts} {msg}\n"

        tag = "INFO"
        if "[WARN]" in msg:   tag = "WARN"
        elif "[ERROR]" in msg: tag = "ERROR"
        elif "[FATAL]" in msg: tag = "ERROR"
        elif "[DRY RUN]" in msg: tag = "DRY"
        elif "[DEBUG]" in msg: tag = "DEBUG"
        elif "완료" in msg or "성공" in msg: tag = "DONE"

        self.log_text.insert("end", line, tag)
        self.log_text.see("end")
        self.log_text.configure(state="disabled")

    def _start_trading(self):
        # 설정 검증
        cfg = self.cfg
        for key, label in [
            ("spreadsheet_name", "스프레드시트 이름"),
            ("secret_key_path",  "Secret Key 경로"),
            ("worksheet_name",   "워크시트 이름"),
        ]:
            var = getattr(self, f"var_{key}", None)
            val = var.get() if var else cfg.get(key, "")
            if not val:
                messagebox.showerror("설정 오류", f"{label}을 입력해주세요.")
                return

        # 최신 설정값 반영
        for key in DEFAULT_CONFIG:
            var = getattr(self, f"var_{key}", None)
            if var:
                self.cfg[key] = var.get()
        save_config(self.cfg)

        self.running = True
        self.start_btn.configure(state="disabled")
        self.stop_btn.configure(state="normal")
        self.status_var.set("▶ 실행 중...")
        self._clear_log()

        self.trade_thread = threading.Thread(
            target=self._run_trading, daemon=True)
        self.trade_thread.start()

    def _stop_trading(self):
        self.running = False
        self.status_var.set("⏹ 중단 요청됨...")
        self._append_log("[INFO] 중단 요청됨 — 현재 주문 완료 후 종료됩니다.")

    def _run_trading(self):
        try:
            self._append_log("[INFO] 자동매매 시작...")
            enable_order = "TRUE" if self.enable_order_var.get() else "FALSE"
            run_trade(self.cfg, enable_order, self._append_log,
                      lambda: self.running)
            self._append_log("[INFO] ✅ 모든 주문 처리 완료.")
            self.status_var.set("✅ 완료")
        except Exception as e:
            self._append_log(f"[ERROR] 실행 오류: {e}")
            self._append_log(traceback.format_exc())
            self.status_var.set("❌ 오류 발생")
        finally:
            self.running = False
            self.root.after(0, lambda: self.start_btn.configure(state="normal"))
            self.root.after(0, lambda: self.stop_btn.configure(state="disabled"))


# ============================================================
# 핵심 거래 로직 (GUI와 분리)
# ============================================================
def run_trade(cfg, enable_order_str, log_fn, is_running_fn):
    """
    GUI에서 호출하는 실제 거래 함수
    log_fn: 로그 출력 콜백
    is_running_fn: 실행 중 여부 확인 콜백 (False면 중단)
    """
    import requests
    import gspread
    import pyautogui
    import win32gui, win32con, win32api
    from pywinauto import Application, Desktop
    from pywinauto.keyboard import send_keys
    from oauth2client.service_account import ServiceAccountCredentials

    pyautogui.FAILSAFE = False

    # 설정값 추출
    SPREADSHEET_NAME   = cfg["spreadsheet_name"]
    WORKSHEET_NAME     = cfg["worksheet_name"]
    SECRET_KEY_PATH    = cfg["secret_key_path"]
    KIWOOM_EXE         = cfg["kiwoom_exe_path"]
    PIN                = cfg["simple_auth_pin"]
    LOG_DIR            = cfg["log_dir"]
    TG_TOKEN           = cfg.get("telegram_token", "")
    TG_CHAT_ID         = cfg.get("telegram_chat_id", "")
    KIWOOM_MAIN_TITLE  = "영웅문Global"
    MARKET_ORDER_TYPES = {"시장가", "MOC", "LOC", "VWAP시장가", "TWAP시장가"}
    SCREEN_NUM_EDIT_X  = 47
    SCREEN_NUM_EDIT_Y  = 70
    OFFSET_STOCK       = (8,   30)
    OFFSET_ACCOUNT     = (381, 30)
    OFFSET_QUANTITY    = (415, 127)
    OFFSET_PRICE       = (415, 171)
    OFFSET_TOLERANCE   = 15
    OFFSET_BTN_BUY_EXEC= (381, 260)

    def log(msg):
        log_fn(msg)

    def safe_int(v, default=0):
        try: return int(str(v).replace(",","").strip())
        except: return default

    def safe_float(v, default=0.0):
        try: return float(str(v).replace(",","").strip())
        except: return default

    def pad_row(row, n=30):
        row = row or []
        return (row + [""]*n)[:n]

    # Google Sheets 연결
    scope = ["https://spreadsheets.google.com/feeds",
             "https://www.googleapis.com/auth/drive"]
    creds = ServiceAccountCredentials.from_json_keyfile_name(SECRET_KEY_PATH, scope)
    gc    = gspread.authorize(creds)
    ws    = gc.open(SPREADSHEET_NAME).worksheet(WORKSHEET_NAME)
    log(f"[INFO] 워크시트 연결: {ws.title}")

    enable_order = ws.acell("E4").value or enable_order_str

    # 영웅문 연결
    def get_main_hwnd():
        hwnd = win32gui.FindWindow(None, KIWOOM_MAIN_TITLE)
        if hwnd and win32gui.IsWindowVisible(hwnd):
            return hwnd
        return None

    def connect_or_launch():
        hwnd = get_main_hwnd()
        if hwnd:
            log(f"[INFO] 영웅문 발견 hwnd={hwnd:#010x}")
            win32gui.ShowWindow(hwnd, win32con.SW_RESTORE)
            win32gui.BringWindowToTop(hwnd)
            return
        log("[INFO] 영웅문 실행 중...")
        subprocess.Popen([KIWOOM_EXE], shell=False)
        time.sleep(8)
        # 로그인
        for w in Desktop(backend="uia").windows():
            t = w.window_text()
            if "로그인" in t or "Login" in t:
                hwnd2 = w.handle
                win32gui.ShowWindow(hwnd2, win32con.SW_RESTORE)
                win32gui.SetForegroundWindow(hwnd2)
                time.sleep(1)
                r = w.rectangle()
                pyautogui.click(r.left + int((r.right-r.left)*0.62),
                                r.top  + int((r.bottom-r.top)*0.20))
                time.sleep(4)
                for ch in PIN:
                    pyautogui.press(ch); time.sleep(0.3)
                pyautogui.press("enter")
                log("[INFO] PIN 입력 완료. 15초 대기...")
                time.sleep(15)
                break
        for _ in range(36):
            if get_main_hwnd(): break
            time.sleep(5)

    connect_or_launch()

    # 팝업 정리
    def close_popups():
        hwnd = get_main_hwnd()
        if not hwnd: return
        to_close = []
        def cb(h, _):
            try:
                t = win32gui.GetWindowText(h)
                c = win32gui.GetClassName(h)
                if not win32gui.IsWindowVisible(h): return
                if ("2102" in t or "7075" in t or "유의사항" in t) and "Afx:" in c:
                    to_close.append(h)
            except: pass
        win32gui.EnumChildWindows(hwnd, cb, None)
        for h in to_close:
            btns = []
            def fb(hh, _):
                try:
                    if win32gui.GetWindowText(hh).strip() in ["확인","OK","닫기"]:
                        btns.append(hh)
                except: pass
            try: win32gui.EnumChildWindows(h, fb, None)
            except: pass
            if btns: win32api.PostMessage(btns[0], win32con.BM_CLICK, 0, 0)
            else:    win32gui.PostMessage(h, win32con.WM_CLOSE, 0, 0)
            time.sleep(0.2)
        if to_close: log(f"[INFO] 팝업 {len(to_close)}개 닫음")
        time.sleep(0.5)

    close_popups()

    # 2100창
    def get_2100_hwnd():
        result = []
        def cb(h,_):
            try:
                if "[2100]" in win32gui.GetWindowText(h) and "Afx:" in win32gui.GetClassName(h):
                    result.append(h)
            except: pass
        main = get_main_hwnd()
        if main: win32gui.EnumChildWindows(main, cb, None)
        if not result: raise Exception("2100창 없음")
        return result[0]

    def get_2100_uia():
        app = Application(backend="uia").connect(title=KIWOOM_MAIN_TITLE)
        for w in app.window(title=KIWOOM_MAIN_TITLE).descendants(control_type="Window"):
            if "[2100]" in w.window_text(): return w
        raise Exception("2100 uia 없음")

    def open_2100():
        main = get_main_hwnd()
        win32gui.BringWindowToTop(main)
        time.sleep(0.5)
        pyautogui.click(SCREEN_NUM_EDIT_X, SCREEN_NUM_EDIT_Y)
        time.sleep(0.3)
        send_keys("^a{BACKSPACE}2100{ENTER}", pause=0.05)
        for _ in range(20):
            time.sleep(0.5)
            try: get_2100_hwnd(); log("[INFO] 2100창 열기 성공"); return
            except: pass

    try: get_2100_hwnd()
    except: open_2100()

    # 컨트롤 헬퍼
    def find_by_offset(win_hwnd, ol, ot, cls="Edit", tol=OFFSET_TOLERANCE):
        wr = win32gui.GetWindowRect(win_hwnd)
        tl, tt = wr[0]+ol, wr[1]+ot
        best, best_d = None, float("inf")
        def cb(h,_):
            nonlocal best, best_d
            try:
                if win32gui.GetClassName(h)!=cls or not win32gui.IsWindowVisible(h): return
                r=win32gui.GetWindowRect(h)
                if abs(r[0]-tl)<=tol and abs(r[1]-tt)<=tol:
                    d=abs(r[0]-tl)+abs(r[1]-tt)
                    if d<best_d: best_d=d; best=h
            except: pass
        win32gui.EnumChildWindows(win_hwnd, cb, None)
        return best

    def find_edit_by_text(win_hwnd, contains):
        res=[]
        def cb(h,_):
            try:
                if win32gui.GetClassName(h)=="Edit" and win32gui.IsWindowVisible(h):
                    t=win32gui.GetWindowText(h)
                    r=win32gui.GetWindowRect(h)
                    if contains in t and r[0]>0 and r[1]>0:
                        res.append((r[1],h,t))
            except: pass
        win32gui.EnumChildWindows(win_hwnd, cb, None)
        res.sort()
        return res[0][1] if res else None

    def do_click(hwnd):
        r=win32gui.GetWindowRect(hwnd)
        cx,cy=(r[0]+r[2])//2,(r[1]+r[3])//2
        win32gui.BringWindowToTop(get_main_hwnd())
        time.sleep(0.1); pyautogui.click(cx,cy); time.sleep(0.15)

    def click_offset(win_hwnd, ol, ot):
        wr=win32gui.GetWindowRect(win_hwnd)
        win32gui.BringWindowToTop(get_main_hwnd())
        time.sleep(0.1); pyautogui.click(wr[0]+ol+8, wr[1]+ot+8); time.sleep(0.2)

    def set_text(hwnd, text):
        do_click(hwnd); time.sleep(0.1)
        send_keys("^a{BACKSPACE}", pause=0.05); time.sleep(0.1)
        send_keys(str(text), pause=0.03); time.sleep(0.2)

    # 탭 전환
    def is_active(uia, mode):
        try:
            for c in uia.descendants(control_type="TabItem"):
                if c.window_text().strip()==mode:
                    return bool(c.iface_selection_item.CurrentIsSelected)
        except: pass
        return False

    def switch_tab(uia, mode):
        if is_active(uia, mode):
            log(f"[INFO] ① 탭 이미 {mode}"); return True
        tab=None
        for c in uia.descendants(control_type="TabItem"):
            if c.window_text().strip()==mode: tab=c; break
        if not tab: raise Exception(f"TabItem '{mode}' 없음")
        try: tab.click_input(); time.sleep(0.3)
        except: pass
        if is_active(uia, mode): log(f"[INFO] ① 탭전환 성공: {mode}"); return True
        try: tab.set_focus(); send_keys("{SPACE}"); time.sleep(0.3)
        except: pass
        if is_active(uia, mode): log(f"[INFO] ① 탭전환(SPACE): {mode}"); return True
        try:
            r=tab.rectangle()
            pyautogui.click((r.left+r.right)//2,(r.top+r.bottom)//2)
            time.sleep(0.3)
        except: pass
        end=time.time()+2
        while time.time()<end:
            if is_active(uia,mode): log(f"[INFO] ① 탭전환(좌표): {mode}"); return True
            time.sleep(0.1)
        log(f"[ERROR] 탭전환 실패: {mode}"); return False

    # 주문 처리
    orders = ws.get("I4:O33")
    enable_normalized = str(enable_order).strip().upper()

    for i, raw in enumerate(orders, start=4):
        if not is_running_fn():
            log("[INFO] 중단 요청으로 종료")
            break

        row = pad_row(raw, 7)
        if str(row[0]).strip().upper() != "TRUE":
            continue

        acc   = safe_int(row[1], 1)
        stock = str(row[2]).strip()
        otype = str(row[3]).strip()
        tmethod = str(row[4]).strip()
        price = safe_float(row[5], 0.0)
        qty   = safe_int(row[6], 0)

        if not stock or qty <= 0:
            log(f"[INFO] Row {i}: 종목/수량 없음 → 종료")
            break

        log(f"[INFO] Row {i} | {stock} | {otype} | {tmethod} | Qty={qty} | Price={price}")

        try:
            try: win2100 = get_2100_hwnd()
            except:
                open_2100(); win2100 = get_2100_hwnd()

            uia2100 = get_2100_uia()
            win32gui.BringWindowToTop(get_main_hwnd())
            time.sleep(0.3)

            # ① 탭
            if not switch_tab(uia2100, otype):
                raise Exception(f"탭전환 실패: {otype}")
            time.sleep(0.3); win2100 = get_2100_hwnd()

            # ② 계좌
            acc_field = find_by_offset(win2100, *OFFSET_ACCOUNT)
            if acc_field:
                do_click(acc_field); time.sleep(0.1)
                send_keys("{UP 10}",pause=0.05)
                if acc>1: send_keys(f"{{DOWN {acc-1}}}",pause=0.05)
                send_keys("{ENTER}",pause=0.05)
                log(f"[INFO] ② 계좌: index={acc}")
            time.sleep(0.3)

            # ③ 종목
            sf = find_by_offset(win2100, *OFFSET_STOCK)
            if not sf: raise Exception("종목 Edit 없음")
            do_click(sf)
            send_keys("^a{BACKSPACE}",pause=0.05); time.sleep(0.1)
            send_keys(stock.upper(),pause=0.05)
            send_keys("{TAB}",pause=0.05)
            log(f"[INFO] ③ 종목: {stock}")
            time.sleep(0.8); win2100=get_2100_hwnd()

            # ④ 거래종류
            mf = (find_edit_by_text(win2100,"지정가") or
                  find_edit_by_text(win2100,"LOC") or
                  find_edit_by_text(win2100,"시장가") or
                  find_by_offset(win2100,416,106))
            if not mf: raise Exception("거래종류 Edit 없음")
            win32api.SendMessage(mf, win32con.WM_SETTEXT, 0, tmethod)
            time.sleep(0.2); do_click(mf); time.sleep(0.1)
            send_keys("{ENTER}",pause=0.05); time.sleep(0.3)
            actual=win32gui.GetWindowText(mf)
            log(f"[INFO] ④ 거래종류: {tmethod} → {actual}")
            if tmethod not in actual:
                do_click(mf); time.sleep(0.2)
                send_keys("^a{BACKSPACE}",pause=0.05)
                send_keys(tmethod,pause=0.05)
                send_keys("{ENTER}",pause=0.05); time.sleep(0.3)
                log(f"[INFO] ④ 재시도: {win32gui.GetWindowText(mf)}")
            win2100=get_2100_hwnd()

            # ⑤ 수량
            qf=find_by_offset(win2100,*OFFSET_QUANTITY)
            if not qf: raise Exception("수량 Edit 없음")
            set_text(qf,str(qty)); log(f"[INFO] ⑤ 수량: {qty}")
            time.sleep(0.3)

            # ⑥ 가격
            if tmethod not in MARKET_ORDER_TYPES and price>0:
                pf=find_by_offset(win2100,*OFFSET_PRICE)
                if pf: set_text(pf,f"{price:.2f}"); log(f"[INFO] ⑥ 가격: {price:.2f}")
            else:
                log(f"[INFO] 가격 생략 ({tmethod})")

            # ⑦ 주문
            if enable_normalized=="TRUE":
                win2100=get_2100_hwnd()
                if otype=="매수":
                    click_offset(win2100,*OFFSET_BTN_BUY_EXEC)
                    log("[INFO] ⑦ 매수(F9) 클릭")
                else:
                    win32gui.BringWindowToTop(get_main_hwnd())
                    time.sleep(0.2); pyautogui.press("f12")
                    log("[INFO] ⑦ 매도 F12")
                time.sleep(0.8); pyautogui.press("enter")
                log(f"[INFO] Row {i}: {otype} 주문 완료 ✅")
            else:
                log(f"[DRY RUN] Row {i}: 건너뜀")

            time.sleep(1.5)

        except Exception as e:
            log(f"[ERROR] Row {i} 실패: {e}")
            log(traceback.format_exc())
            time.sleep(0.5)

    # 텔레그램 알림
    if TG_TOKEN and TG_CHAT_ID:
        try:
            msg = (f"{WORKSHEET_NAME} 주문 완료" if enable_normalized=="TRUE"
                   else f"{WORKSHEET_NAME} DRY RUN 완료")
            import requests as req
            req.post(f"https://api.telegram.org/bot{TG_TOKEN}/sendMessage",
                     data={"chat_id": TG_CHAT_ID, "text": msg}, timeout=10)
        except Exception as e:
            log(f"[WARN] 텔레그램 실패: {e}")


# ============================================================
# EXE 빌드 방법 안내
# ============================================================
BUILD_GUIDE = """
=== EXE 파일 만드는 방법 ===

1. PyInstaller 설치:
   pip install pyinstaller

2. EXE 빌드 (아이콘 없는 경우):
   pyinstaller --onefile --windowed auto_trade_gui.py

3. EXE 빌드 (아이콘 있는 경우):
   pyinstaller --onefile --windowed --icon=icon.ico auto_trade_gui.py

4. 빌드 완료 후 dist 폴더에 auto_trade_gui.exe 생성됨

5. 배포 시 같은 폴더에 포함할 파일:
   - auto_trade_gui.exe
   - secret_key.json  (사용자가 본인 키 사용)
   ※ config.json은 첫 실행 시 자동 생성됨
"""

# ============================================================
# 실행
# ============================================================
if __name__ == "__main__":
    # EXE 빌드 가이드 출력 (터미널에서 실행 시)
    if "--build-guide" in sys.argv:
        print(BUILD_GUIDE)
        sys.exit(0)

    root = tk.Tk()
    app = AutoTradeApp(root)
    root.mainloop()