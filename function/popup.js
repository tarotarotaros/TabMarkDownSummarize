document.addEventListener('DOMContentLoaded', () => {
    chrome.storage.local.get('markdownOutput', (data) => {
        document.getElementById('output').value = data.markdownOutput || '';
    });

    document.getElementById('save').addEventListener('click', () => {
        const markdown = document.getElementById('output').value;
        chrome.storage.local.set({ markdownOutput: markdown }, () => {
            alert("保存しました。");
        });
    });
});
