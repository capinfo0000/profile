/* ============================================================
   作品データ
   ------------------------------------------------------------
   一覧はここだけを直せば増減する。HTMLには手を入れない。
   （要件定義 2章「一覧の管理はデータファイルで」に対応）

   color : この作品の色。背景パターン・ラベル・カーソルに流れる
   access: 'open'  … 誰でも使える。実物へのリンクを出す
           'login' … ログインが必要。注意書きを出す
           'closed'… 公開終了
   ============================================================ */
window.WORKS = [
  {
    id: 'rag',
    title: 'RAG Chatbot',
    sub: '埋め込み型RAGチャットボット',
    category: 'サービス開発',
    role: '企画・開発・運用',
    tech: ['Python', 'FastAPI', 'ベクトル検索', 'HTML/CSS'],
    color: '#3E6BE0',
    access: 'login',
    url: 'https://rag.engineer.v2008.coreserver.jp/'
  },
  {
    id: 'map',
    title: 'Parking Map',
    sub: 'みんなの駐車場マップ',
    category: 'サービス開発',
    role: '企画・開発・運用',
    tech: ['PHP', '地図API', 'MySQL'],
    color: '#1F9E6B',
    access: 'login',
    url: 'https://map.engineer.v2008.coreserver.jp/'
  },
  {
    id: 'event',
    title: 'Event Prepay',
    sub: 'イベント事前決済',
    category: 'サービス開発',
    role: '企画・開発・運用',
    tech: ['PHP', '決済API', 'MySQL'],
    color: '#D2542F',
    access: 'login',
    url: 'https://event.engineer.v2008.coreserver.jp/'
  },
  {
    id: 'webbox',
    title: 'Web Suggestion Box',
    sub: 'WEB意見箱',
    category: 'サービス開発',
    role: '企画・開発・運用',
    tech: ['PHP', 'MySQL'],
    color: '#7B5EA7',
    access: 'login',
    url: 'https://webbox.engineer.v2008.coreserver.jp/'
  },
  {
    id: 'enlink',
    title: 'Enlink',
    sub: 'ビジネスマッチング',
    category: 'サービス開発',
    role: '企画・開発・運用',
    tech: ['PHP', 'MySQL'],
    color: '#0F7C8C',
    access: 'login',
    url: 'https://enlink.engineer.v2008.coreserver.jp/'
  },
  {
    id: 'alcohol',
    title: 'Drinking Game',
    sub: '飲みゲーム',
    category: 'サービス開発',
    role: '企画・開発',
    tech: ['JavaScript', 'HTML/CSS'],
    color: '#E0A21B',
    access: 'open',
    url: 'https://alcohol.engineer.v2008.coreserver.jp/'
  },
  {
    id: 'crafy',
    title: 'crafy',
    sub: 'キャンペーンサイト',
    category: 'Web制作',
    role: '制作',
    tech: ['HTML/CSS', 'JavaScript'],
    color: '#C0356E',
    access: 'open',
    url: 'https://crafy.engineer.v2008.coreserver.jp/'
  },
  {
    id: 'revenge',
    title: 'revenge.co.jp',
    sub: '企業サイトの制作・運用',
    category: 'Web制作',
    role: '制作・運用',
    tech: ['HTML/CSS', 'JavaScript'],
    color: '#2B3A55',
    access: 'open',
    url: 'https://revenge.co.jp/'
  }
];
