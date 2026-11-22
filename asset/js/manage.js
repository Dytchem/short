/*
 * Copyright (c) molikai-work (2024)
 * molikai-work 的特定修改和新增部分
 * 根据 MIT 许可证发布
 *
 * 2026-11-22：去 jQuery 化，改原生 JS；结果提示改用 textContent 构造节点，
 * 不再把服务端消息拼进 innerHTML
 */

document.addEventListener('DOMContentLoaded', function () {
    const operationSel = document.getElementById('operation');
    const groups = {
        'update-url': document.getElementById('newUrlGroup'),
        'update-slug': document.getElementById('newSlugGroup'),
        'update-password': document.getElementById('newPasswordGroup'),
        'toggle-status': document.getElementById('proxyUrlTip')
    };

    operationSel.addEventListener('change', function () {
        for (const el of Object.values(groups)) {
            if (el) el.style.display = 'none';
        }
        const target = groups[operationSel.value];
        if (target) target.style.display = '';
    });

    const resultBox = document.getElementById('result');
    function showResult(ok, message) {
        const div = document.createElement('div');
        div.className = ok ? 'alert' : 'errorAlert';
        div.setAttribute('role', 'alert');
        div.textContent = message;
        resultBox.replaceChildren(div);
    }

    document.getElementById('apiForm').addEventListener('submit', async function (event) {
        event.preventDefault();
        const submitButton = document.getElementById('submit');
        const operation = operationSel.value;
        const slug = document.getElementById('slug').value;
        const password = document.getElementById('password').value;
        const turnstileField = document.querySelector('[name="cf-turnstile-response"]');
        const turnstileToken = turnstileField ? turnstileField.value : undefined;

        if (!slug) {
            showResult(false, '请填写你要管理的 Slug');
            return;
        }

        const requestData = { operation, slug, password, turnstileToken };
        if (operation === 'update-url') {
            requestData.newUrl = document.getElementById('newUrl').value;
        } else if (operation === 'update-slug') {
            requestData.newSlug = document.getElementById('newSlug').value;
        } else if (operation === 'update-password') {
            requestData.newPassword = document.getElementById('newPassword').value;
        }

        submitButton.disabled = true;
        try {
            const resp = await fetch('/manage', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestData)
            });
            const data = await resp.json().catch(() => null);
            if (data && resp.ok) {
                showResult(true, data.message || '操作成功');
            } else {
                showResult(false, (data && data.message) || '操作失败，请重试');
            }
        } catch (err) {
            console.error('manage failed:', err);
            showResult(false, '操作失败，请重试');
        } finally {
            submitButton.disabled = false;
        }
    });
});
