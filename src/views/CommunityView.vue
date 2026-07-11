<template>
  <div class="page-placeholder">
    <header class="topbar">
      <label class="search-box">
        <span>搜索</span>
        <input type="search" placeholder="搜索社区动态、乐评">
      </label>
    </header>
    <section class="section-block">
      <div class="section-heading">
        <h2>社区动态</h2>
      </div>
      <div class="community-grid">
        <article>
          <p class="eyebrow">热门评论</p>
          <blockquote>"听到前奏的那一秒，整个夏天都回来了。"</blockquote>
          <span>来自《晴天》的热门评论 · 2.3万赞</span>
        </article>
        <article>
          <p class="eyebrow">最新动态</p>
          <blockquote>"每当夜深人静的时候，这首歌总能让我安静下来。"</blockquote>
          <span>来自《平凡之路》的评论 · 1.8万赞</span>
        </article>
      </div>
    </section>
  </div>
</template>

<style scoped>
.page-placeholder { padding: 0; }
.topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 18px;
  margin-bottom: 28px;
}
.search-box {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border: 1px solid var(--rule);
  border-radius: 999px;
  background: var(--panel);
  backdrop-filter: blur(22px);
}
.search-box span { color: var(--muted); }
.search-box input {
  width: 100%;
  border: 0;
  outline: 0;
  color: var(--ink);
  background: transparent;
}
.section-block {
  padding: 26px;
  border: 1px solid var(--rule);
  border-radius: 26px;
  background: var(--panel);
  backdrop-filter: blur(24px);
}
.section-heading h2 { margin: 0 0 24px; font-size: 26px; }
.community-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}
.community-grid article {
  padding: 26px;
  border: 1px solid var(--rule);
  border-radius: 26px;
  background: var(--panel);
  backdrop-filter: blur(24px);
}
.eyebrow {
  margin: 0 0 8px;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.12em;
  color: var(--accent-2);
}
blockquote {
  margin: 14px 0;
  color: var(--ink);
  font-size: 18px;
  line-height: 1.6;
}
.community-grid span { color: var(--muted); font-size: 13px; }

@media (max-width: 640px) {
  .community-grid { grid-template-columns: 1fr; }
}
</style>