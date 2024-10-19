// ページ内のテキストデータを取得して返す
(() => {
    const bodyText = document.body.innerText;
    // 一定の長さに制限（500文字以内）する場合
    const truncatedText = bodyText.length > 500 ? bodyText.slice(0, 500) + '...' : bodyText;
    return truncatedText;
})();
