"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export const LANGS: Record<string, string> = { en: "English", zh: "中文", ru: "Русский", ja: "日本語" };
export type Lang = keyof typeof LANGS;

// Protocol terms (x402, 402, FB, xpub, payAndFetch, UniSat, SDK, MIT, API) are left untranslated.
const en: Record<string, string> = {
  "nav.how": "How it works", "nav.getKey": "Get an API key",
  "hero.badge": "402 Payment Required · Fractal Bitcoin",
  "hero.title": "The payment rail for autonomous agents.",
  "hero.title1": "The payment rail for", "hero.title2": "autonomous agents.", "hero.badgeTail": "Fractal Bitcoin",
  "hero.lead": "An open HTTP-402 standard for paying per request — settled on-chain in Fractal Bitcoin, non-custodial, with no accounts. Providers earn per call; agents pay themselves.",
  "hero.m1": "open source (MIT)", "hero.m2": "non-custodial", "hero.m3": "no accounts", "hero.m4": "settles on-chain in FB",
  "flow.title": "The flow — one ordered exchange",
  "flow.s1t": "Request", "flow.s1d": "An agent or app calls a paid endpoint. No key, no signup, no card.",
  "flow.s2t": "402", "flow.s2d": "The server answers with a price and a fresh FB address derived from the provider's xpub.",
  "flow.s3t": "Pay", "flow.s3d": "The caller broadcasts one FB transaction — provider + network fee in a single tx, wallet to wallet.",
  "flow.s4t": "200", "flow.s4d": "We verify it on-chain and the endpoint serves. Funds never touch us — non-custodial by design.",
  "two.title": "Two sides, one transaction",
  "prov.tag": "providers", "prov.title": "Sell any endpoint, earn in FB",
  "prov.lead": "Wrap a route in one line and set a price. Your server holds only an API key — no node, no keys, no database.",
  "prov.li1": "Data, compute, an LLM call, a download — anything HTTP returns",
  "prov.li2": "Paid straight to your own xpub, per call",
  "prov.li3": "Price each call in FB sats — you set the rate",
  "agt.tag": "agents", "agt.title": "Let software pay for itself",
  "agt.lead": "An agent that hits a 402 pays it and retries — no human, no checkout. TypeScript and Python SDKs.",
  "agt.li1": "payAndFetch(url) handles the 402 → pay → retry loop",
  "agt.li2": "~30s settlement, near-zero fees on Fractal",
  "agt.li3": "Headless by design — built for autonomous agents and pipelines",
  "code.prov": "Provider · charge per call", "code.agt": "Agent · pay automatically",
  "open.title": "Open protocol. Run it yourself.",
  "open.lead": "The spec and SDKs are MIT. Self-host the facilitator, or use ours and skip the infrastructure.",
  "open.spec": "Read the spec",
  "foot.tag": "open-source, non-custodial",
  "c.title": "Connect your wallet",
  "c.lead": "Sign in with your Fractal (UniSat) wallet — no email, no password. Your FB address is your account and your payout identity.",
  "c.cta": "Connect UniSat wallet", "c.busy": "Waiting for signature…",
  "c.works": "Works with any UniSat address — SegWit (bc1q) or Taproot (bc1p).",
  "c.home": "← Home", "c.noWallet": "Don't have UniSat?", "c.get": "Get the wallet →",
  "c.s1": "Open UniSat and switch the network to Fractal.",
  "c.s2": "Click connect and approve the signature — it's free and moves no funds.",
  "c.s3": "You're in. Create a service and get your API key.",
  "c.secure": "Sign-in is a wallet signature (BIP322). We never see a private key or seed phrase.",
};
const zh: Record<string, string> = {
  "nav.how": "工作原理", "nav.getKey": "获取 API 密钥",
  "hero.badge": "402 需要付款 · Fractal Bitcoin",
  "hero.title": "面向自主智能体的支付通道。",
  "hero.title1": "面向自主智能体的", "hero.title2": "支付通道。", "hero.badgeTail": "Fractal Bitcoin",
  "hero.lead": "一个开放的 HTTP-402 按次付费标准——在 Fractal Bitcoin 上链上结算，非托管，无需账户。提供方按调用收款；智能体自行付款。",
  "hero.m1": "开源 (MIT)", "hero.m2": "非托管", "hero.m3": "无需账户", "hero.m4": "以 FB 链上结算",
  "flow.title": "流程 —— 一次有序的交互",
  "flow.s1t": "请求", "flow.s1d": "智能体或应用调用付费接口。无密钥、无注册、无信用卡。",
  "flow.s2t": "402", "flow.s2d": "服务器返回价格，以及从提供方 xpub 派生的全新 FB 地址。",
  "flow.s3t": "付款", "flow.s3d": "调用方广播一笔 FB 交易——提供方与网络费用在同一笔交易中，钱包对钱包。",
  "flow.s4t": "200", "flow.s4d": "我们在链上验证后接口即返回结果。资金从不经过我们——天生非托管。",
  "two.title": "两端，一笔交易",
  "prov.tag": "提供方", "prov.title": "出售任意接口，以 FB 收款",
  "prov.lead": "一行代码包裹路由并设定价格。你的服务器只持有 API 密钥——无需节点、无需私钥、无需数据库。",
  "prov.li1": "数据、算力、LLM 调用、下载——任何 HTTP 可返回的内容",
  "prov.li2": "按调用直接付到你自己的 xpub",
  "prov.li3": "每次调用以 FB 聪计价——费率由你设定",
  "agt.tag": "智能体", "agt.title": "让软件自行付费",
  "agt.lead": "遇到 402 的智能体会付款并重试——无需人工、无需结账。提供 TypeScript 与 Python SDK。",
  "agt.li1": "payAndFetch(url) 自动处理 402 → 付款 → 重试 流程",
  "agt.li2": "约 30 秒结算，Fractal 上费用近乎为零",
  "agt.li3": "专为自主智能体与自动化流程设计，无需人工",
  "code.prov": "提供方 · 按调用收费", "code.agt": "智能体 · 自动付款",
  "open.title": "开放协议。自行部署。",
  "open.lead": "规范与 SDK 均为 MIT 许可。自行托管 facilitator，或使用我们的服务、省去基础设施。",
  "open.spec": "阅读规范",
  "foot.tag": "开源、非托管",
  "c.title": "连接你的钱包",
  "c.lead": "使用你的 Fractal (UniSat) 钱包登录——无需邮箱、无需密码。你的 FB 地址即账户与收款身份。",
  "c.cta": "连接 UniSat 钱包", "c.busy": "等待签名…",
  "c.works": "支持任意 UniSat 地址——SegWit (bc1q) 或 Taproot (bc1p)。",
  "c.home": "← 首页", "c.noWallet": "还没有 UniSat？", "c.get": "获取钱包 →",
  "c.s1": "打开 UniSat，并将网络切换到 Fractal。",
  "c.s2": "点击连接并批准签名——免费且不转移任何资金。",
  "c.s3": "完成。创建服务并获取你的 API 密钥。",
  "c.secure": "登录只是一次钱包签名 (BIP322)。我们绝不接触私钥或助记词。",
};
const ru: Record<string, string> = {
  "nav.how": "Как это работает", "nav.getKey": "Получить API-ключ",
  "hero.badge": "402 Требуется оплата · Fractal Bitcoin",
  "hero.title": "Платёжный канал для автономных агентов.",
  "hero.title1": "Платёжный канал для", "hero.title2": "автономных агентов.", "hero.badgeTail": "Fractal Bitcoin",
  "hero.lead": "Открытый стандарт HTTP-402 для оплаты за запрос — расчёт ончейн в Fractal Bitcoin, без кастодиальности и без аккаунтов. Провайдеры зарабатывают за вызов; агенты платят сами.",
  "hero.m1": "открытый код (MIT)", "hero.m2": "без кастодиальности", "hero.m3": "без аккаунтов", "hero.m4": "расчёт ончейн в FB",
  "flow.title": "Поток — один упорядоченный обмен",
  "flow.s1t": "Запрос", "flow.s1d": "Агент или приложение вызывает платный эндпоинт. Без ключа, регистрации и карты.",
  "flow.s2t": "402", "flow.s2d": "Сервер отвечает ценой и новым FB-адресом, выведенным из xpub провайдера.",
  "flow.s3t": "Оплата", "flow.s3d": "Вызывающий публикует одну FB-транзакцию — провайдер и комиссия сети в одной транзакции, кошелёк кошельку.",
  "flow.s4t": "200", "flow.s4d": "Мы проверяем её ончейн, и эндпоинт отдаёт результат. Средства не проходят через нас — некастодиально по дизайну.",
  "two.title": "Две стороны, одна транзакция",
  "prov.tag": "провайдеры", "prov.title": "Продавайте любой эндпоинт, зарабатывайте в FB",
  "prov.lead": "Оберните маршрут одной строкой и задайте цену. Ваш сервер хранит только API-ключ — без ноды, ключей и базы данных.",
  "prov.li1": "Данные, вычисления, вызов LLM, загрузка — всё, что возвращает HTTP",
  "prov.li2": "Оплата сразу на ваш собственный xpub, за каждый вызов",
  "prov.li3": "Цена за вызов в сатоши FB — ставку задаёте вы",
  "agt.tag": "агенты", "agt.title": "Пусть софт платит сам за себя",
  "agt.lead": "Агент, получивший 402, оплачивает и повторяет запрос — без человека и оформления. SDK на TypeScript и Python.",
  "agt.li1": "payAndFetch(url) сам проходит цикл 402 → оплата → повтор",
  "agt.li2": "Расчёт ~30 c, комиссии в Fractal почти нулевые",
  "agt.li3": "Создан для автономных агентов и конвейеров — без человека",
  "code.prov": "Провайдер · плата за вызов", "code.agt": "Агент · оплата автоматически",
  "open.title": "Открытый протокол. Разверните сами.",
  "open.lead": "Спецификация и SDK под лицензией MIT. Поднимите facilitator сами или используйте наш и пропустите инфраструктуру.",
  "open.spec": "Читать спецификацию",
  "foot.tag": "открытый код, без кастодиальности",
  "c.title": "Подключите кошелёк",
  "c.lead": "Войдите кошельком Fractal (UniSat) — без email и пароля. Ваш FB-адрес — это и аккаунт, и реквизиты для выплат.",
  "c.cta": "Подключить кошелёк UniSat", "c.busy": "Ожидание подписи…",
  "c.works": "Работает с любым адресом UniSat — SegWit (bc1q) или Taproot (bc1p).",
  "c.home": "← На главную", "c.noWallet": "Нет UniSat?", "c.get": "Установить кошелёк →",
  "c.s1": "Откройте UniSat и переключите сеть на Fractal.",
  "c.s2": "Нажмите «Подключить» и подтвердите подпись — это бесплатно и не двигает средства.",
  "c.s3": "Готово. Создайте сервис и получите свой API-ключ.",
  "c.secure": "Вход — это подпись кошельком (BIP322). Мы никогда не видим приватный ключ или сид-фразу.",
};
const ja: Record<string, string> = {
  "nav.how": "仕組み", "nav.getKey": "APIキーを取得",
  "hero.badge": "402 支払いが必要 · Fractal Bitcoin",
  "hero.title": "自律エージェントのための決済レール。",
  "hero.title1": "自律エージェントのための", "hero.title2": "決済レール。", "hero.badgeTail": "Fractal Bitcoin",
  "hero.lead": "リクエストごとに支払うためのオープンな HTTP-402 標準 — Fractal Bitcoin でオンチェーン決済、ノンカストディアル、アカウント不要。プロバイダーは呼び出しごとに収益を得て、エージェントは自ら支払います。",
  "hero.m1": "オープンソース (MIT)", "hero.m2": "ノンカストディアル", "hero.m3": "アカウント不要", "hero.m4": "FB でオンチェーン決済",
  "flow.title": "フロー — 順序のある一つのやり取り",
  "flow.s1t": "リクエスト", "flow.s1d": "エージェントやアプリが有料エンドポイントを呼び出す。鍵も登録もカードも不要。",
  "flow.s2t": "402", "flow.s2d": "サーバーは価格と、プロバイダーの xpub から導出した新しい FB アドレスを返す。",
  "flow.s3t": "支払い", "flow.s3d": "呼び出し側が 1 件の FB トランザクションを送信 — プロバイダーとネットワーク手数料を 1 トランザクションに、ウォレットからウォレットへ。",
  "flow.s4t": "200", "flow.s4d": "オンチェーンで検証し、エンドポイントが応答する。資金は当方を経由しない — 設計上ノンカストディアル。",
  "two.title": "二つの側、一つのトランザクション",
  "prov.tag": "プロバイダー", "prov.title": "あらゆるエンドポイントを売り、FB で稼ぐ",
  "prov.lead": "1 行でルートを包み、価格を設定。サーバーが持つのは API キーのみ — ノードも鍵も DB も不要。",
  "prov.li1": "データ、計算、LLM 呼び出し、ダウンロード — HTTP が返せるものすべて",
  "prov.li2": "呼び出しごとに自分の xpub へ直接入金",
  "prov.li3": "呼び出しごとに FB サトシで価格設定 — レートはあなた次第",
  "agt.tag": "エージェント", "agt.title": "ソフトウェアに自分で支払わせる",
  "agt.lead": "402 を受けたエージェントは支払って再試行する — 人も決済画面も不要。TypeScript と Python の SDK。",
  "agt.li1": "payAndFetch(url) が 402 → 支払い → 再試行 を自動処理",
  "agt.li2": "約 30 秒で決済、Fractal では手数料はほぼゼロ",
  "agt.li3": "自律エージェントとパイプラインのために設計 — 人手は不要",
  "code.prov": "プロバイダー · 呼び出しごとに課金", "code.agt": "エージェント · 自動で支払う",
  "open.title": "オープンなプロトコル。自分で動かせる。",
  "open.lead": "仕様と SDK は MIT。facilitator を自分でホストするか、当方のものを使ってインフラを省く。",
  "open.spec": "仕様を読む",
  "foot.tag": "オープンソース、ノンカストディアル",
  "c.title": "ウォレットを接続",
  "c.lead": "Fractal (UniSat) ウォレットでサインイン — メールもパスワードも不要。FB アドレスがアカウントであり受取先です。",
  "c.cta": "UniSat ウォレットを接続", "c.busy": "署名を待っています…",
  "c.works": "あらゆる UniSat アドレスに対応 — SegWit (bc1q) または Taproot (bc1p)。",
  "c.home": "← ホーム", "c.noWallet": "UniSat をお持ちでない？", "c.get": "ウォレットを入手 →",
  "c.s1": "UniSat を開き、ネットワークを Fractal に切り替える。",
  "c.s2": "「接続」をクリックして署名を承認 — 無料で資金は動きません。",
  "c.s3": "完了。サービスを作成して API キーを取得しましょう。",
  "c.secure": "サインインはウォレット署名 (BIP322) です。秘密鍵やシードフレーズを見ることはありません。",
};

const DICTS: Record<Lang, Record<string, string>> = { en, zh, ru, ja };

const Ctx = createContext<{ lang: Lang; setLang: (l: Lang) => void; t: (k: string) => string }>({
  lang: "en", setLang: () => {}, t: (k) => en[k] ?? k,
});

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");
  useEffect(() => {
    const saved = (typeof localStorage !== "undefined" && localStorage.getItem("x402fb_lang")) as Lang | null;
    if (saved && DICTS[saved]) setLangState(saved);
    else { const n = navigator.language.slice(0, 2); if (DICTS[n as Lang]) setLangState(n as Lang); }
  }, []);
  const setLang = (l: Lang) => { setLangState(l); try { localStorage.setItem("x402fb_lang", l); } catch {} };
  const t = (k: string) => DICTS[lang][k] ?? en[k] ?? k;
  return <Ctx.Provider value={{ lang, setLang, t }}>{children}</Ctx.Provider>;
}
export const useT = () => useContext(Ctx);

export function LangSwitcher() {
  const { lang, setLang } = useT();
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <button className="btn btn-sm" onClick={() => setOpen((o) => !o)} aria-haspopup="listbox" aria-expanded={open}>
        ⌘ {LANGS[lang]} ▾
      </button>
      {open && (
        <div role="listbox" style={{ position: "absolute", right: 0, top: "calc(100% + 6px)", background: "var(--panel2)",
          border: "1px solid var(--line2)", borderRadius: 10, padding: 6, minWidth: 150, zIndex: 40 }}>
          {Object.entries(LANGS).map(([code, name]) => (
            <button key={code} role="option" aria-selected={lang === code}
              onClick={() => { setLang(code as Lang); setOpen(false); }}
              style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 10px", borderRadius: 7,
                background: lang === code ? "var(--accent-dim)" : "transparent", color: lang === code ? "var(--accent)" : "var(--ink)",
                border: "none", cursor: "pointer", fontSize: 14 }}>
              {name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
