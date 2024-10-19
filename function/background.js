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
    return data.choices && data.choices[0] ? data.choices[0].message.content : "No summary available.";
}

// APIキーと出力先設定の保存
chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.set({ outputDest: 'popup', apiKey: '', useApiSummary: '' }, () => {
        console.log("Default settings saved");
    });
});

// オプションページでAPIキーと出力先を保存する処理（このコードはoptions.htmlから実行）
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "saveSettings") {
        const { outputDest, apiKey, useApiSummary } = request.data;
        chrome.storage.local.set({ outputDest, apiKey, useApiSummary }, () => {
            console.log("Settings saved:", request.data);
            sendResponse({ status: "success" });
        });
        return true;
    }
});


chrome.commands.onCommand.addListener((command) => {
    if (command === "export_tabs") {
        chrome.windows.getCurrent({ populate: true }, async (window) => {
            let markdown = '';

            // APIキー、出力先、API要約の設定を取得
            chrome.storage.local.get(['outputDest', 'apiKey', 'useApiSummary'], async (data) => {
                const apiKey = data.apiKey;
                const outputDest = data.outputDest || 'popup';
                const useApiSummary = data.useApiSummary || false;  // API要約の使用を設定

                if (useApiSummary && !apiKey) {
                    console.error("API key is not set.");
                    alert("Please set your OpenAI API key in the settings.");
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
                        console.warn(`No content found for tab: ${tab.url}`);
                        return '';
                    }

                    const pageContent = results[0].result || '';

                    // 要約処理（設定に基づいて要約するかどうか）
                    let summary = "";
                    if (useApiSummary) {
                        summary = await summarizeText(pageContent, apiKey);
                        return `- [${tab.title}](${tab.url})\n`;
                    } else {
                        // タブのタイトルとURL、そして要約をマークダウンに追加
                        return `- [${tab.title}](${tab.url})\n  - Summary: ${summary}\n\n`;
                    }

                });

                // すべてのタブの要約が完了するのを待つ
                const allSummaries = await Promise.all(tabSummaries);

                // すべてのタブの要約を連結してマークダウンにまとめる
                markdown = allSummaries.join('');

                // 全てのタブ処理が終わったら、出力先にマークダウンを保存
                if (outputDest === 'popup') {
                    chrome.storage.local.set({ markdownOutput: markdown }, () => {
                        console.log("Markdown saved to popup!");
                    });
                } else if (outputDest === 'file') {
                    const filename = 'tabs_with_summaries.md';
                    const markdownFile = `data:text/markdown;charset=utf-8,${encodeURIComponent(markdown)}`;

                    chrome.downloads.download({
                        url: markdownFile,
                        filename: filename,
                        saveAs: true
                    }, () => {
                        console.log("Markdown saved to file!");
                    });
                } else if (outputDest === 'clipboard') {
                    navigator.clipboard.writeText(markdown).then(() => {
                        console.log("Markdown copied to clipboard!");
                    }).catch(err => {
                        console.error('Could not copy text: ', err);
                    });
                }
            });
        });
    }
});

