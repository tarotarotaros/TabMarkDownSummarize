document.addEventListener('DOMContentLoaded', () => {
    // 出力先とAPIキーの保存された設定を読み込む
    chrome.storage.local.get(['outputDest', 'apiKey'], (data) => {
        document.getElementById('outputDest').value = data.outputDest || 'popup';
        document.getElementById('apiKey').value = data.apiKey || '';
    });

    // 設定を保存する処理
    document.getElementById('saveSettings').addEventListener('click', () => {
        const outputDest = document.getElementById('outputDest').value;
        const apiKey = document.getElementById('apiKey').value;

        chrome.storage.local.set({ outputDest, apiKey }, () => {
            alert("Settings saved!");
        });
    });
});
