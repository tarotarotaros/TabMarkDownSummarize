// 右クリックメニューを追加
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: "exportTabs",
        title: "タブをマークダウン形式でエクスポート",
        contexts: ["all"]
    });

    // デフォルトの設定を保存
    chrome.storage.local.set({ outputDest: 'file', apiKey: '', useApiSummary: false }, () => {
        console.log("デフォルトの設定を保存しました。");
    });
});

// コンテキストメニューがクリックされた時の処理
chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "exportTabs") {
        exportTabsAsMarkdown();
    }
});

// ショートカットキーが押されたときの処理
chrome.commands.onCommand.addListener((command) => {
    if (command === "export_tabs") {
        exportTabsAsMarkdown();
    }
});

// タブ情報を取得してマークダウン形式で出力する関数
function exportTabsAsMarkdown() {
    chrome.windows.getCurrent({ populate: true }, async (window) => {
        let markdown = '';

        // APIキー、出力先、API要約の設定を取得
        chrome.storage.local.get(['outputDest', 'apiKey', 'useApiSummary'], async (data) => {
            const apiKey = data.apiKey;
            const outputDest = data.outputDest || 'file';
            const useApiSummary = data.useApiSummary || false;  // API要約の使用を設定

            if (useApiSummary && !apiKey) {
                console.error("API key is not set.");
                alert("API key が設定されていません。設定画面から設定してください。");
                return;
            }

            // タブごとの処理を非同期で処理し、全てのタブの要約が完了するのを待つ
            const tabSummaries = window.tabs.map(async (tab) => {
                if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
                    console.warn(`Skipping chrome:// or chrome-extension:// URL: ${tab.url}`);
                    return '';
                }

                // 各タブのページ内容を取得するためにコンテンツスクリプトを実行
                const results = await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    function: () => document.body.innerText
                });

                if (!results || !results[0] || !results[0].result) {
                    console.warn(`タブのコンテンツが見つかりません。: ${tab.url}`);
                    return '';
                }

                const pageContent = results[0].result || '';

                let summary = "";
                if (useApiSummary) {
                    summary = await summarizeText(pageContent, apiKey);
                    return `- [${tab.title}](${tab.url})\n  - ${summary}\n\n`;
                } else {
                    return `- [${tab.title}](${tab.url})\n`;
                }

            });

            // すべてのタブの要約が完了するのを待つ
            const allSummaries = await Promise.all(tabSummaries);

            // すべてのタブの要約を連結してマークダウンにまとめる
            markdown = allSummaries.join('');

            // 全てのタブ処理が終わったら、出力先にマークダウンを保存
            if (outputDest === 'popup') {
                chrome.storage.local.set({ markdownOutput: markdown }, () => {
                    console.log("ポップアップを保存しました。");
                });
            } else if (outputDest === 'file') {
                const filename = 'tabs_summaries.md';
                const markdownFile = `data:text/markdown;charset=utf-8,${encodeURIComponent(markdown)}`;

                chrome.downloads.download({
                    url: markdownFile,
                    filename: filename,
                    saveAs: true
                }, () => {
                    console.log("マークダウンファイルを保存しました。");
                });
            } else if (outputDest === 'clipboard') {
                navigator.clipboard.writeText(markdown).then(() => {
                    console.log("クリップボードにコピーしました。");
                }).catch(err => {
                    console.error('コピーできませんでした。：', err);
                });
            }
        });
    });
}

// ChatGPT APIに要約リクエストを送る関数
async function summarizeText(text, apiKey) {
    const apiUrl = 'https://api.openai.com/v1/chat/completions';

    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: "gpt-3.5-turbo",
            "messages": [
                { "role": "user", "content": `下記を日本語で１００字程度で要約してください:\n\n${text}` }
            ]
        })
    });

    const data = await response.json();
    return data.choices && data.choices[0] ? data.choices[0].message.content : "※要約できませんでした。";
}