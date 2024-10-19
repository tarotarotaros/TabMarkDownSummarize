document.addEventListener('DOMContentLoaded', () => {
    chrome.storage.local.get('markdownOutput', (data) => {
        document.getElementById('output').value = data.markdownOutput || '';
    });
});
