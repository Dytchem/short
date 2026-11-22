/*
 * Copyright (c) molikai-work (2024)
 * molikai-work 的特定修改和新增部分
 * 根据 MIT 许可证发布
 *
 * 2026-11-22：去 jQuery 化，改原生 JS（fetch + DOM API），逻辑与原版等价
 */

document.addEventListener('DOMContentLoaded', function () {
    const turnstileBox = document.querySelector('.cf-turnstile');
    if (turnstileBox) turnstileBox.style.display = '';

    const captchaTip = document.getElementById('captcha-tip');
    function checkCaptchaLoaded() {
        if (!captchaTip) return;
        if (turnstileBox && turnstileBox.offsetHeight > 0) {
            captchaTip.style.display = 'none';
        } else {
            captchaTip.style.display = '';
            setTimeout(checkCaptchaLoaded, 400);
        }
    }
    checkCaptchaLoaded();

    const alertBox = document.getElementById('alert');
    const submitBtn = document.getElementById('submit');
    const urlInput = document.getElementById('url');

    function showAlert(type, message) {
        alertBox.className = type || '';
        alertBox.textContent = message;
    }

    submitBtn.addEventListener('click', async function () {
        const url = urlInput.value;
        const slug = document.getElementById('slug').value;
        const password = document.getElementById('password').value;
        const email = document.getElementById('email').value;
        const turnstileField = document.querySelector('[name="cf-turnstile-response"]');
        const turnstileResponse = turnstileField ? turnstileField.value : undefined;

        if (!url) {
            showAlert('error', '请填写你要缩短的 URL');
            return;
        }
        if (!/^(https?):\/\/.{3,}/.test(url)) {
            showAlert('error', 'URL 格式不合规范');
            return;
        }

        showAlert(null, '');
        submitBtn.disabled = true;
        submitBtn.classList.add('loading');

        const body = { url: url, turnstileToken: turnstileResponse };
        if (slug) body.slug = slug;
        if (password) body.password = password;
        if (email) body.email = email;

        try {
            const resp = await fetch('/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            const res = await resp.json().catch(() => null);
            if (!res || (res.message && res.code !== 200)) {
                showAlert('error', (res && res.message) || '抱歉，短链创建失败，请重试');
                return;
            }
            urlInput.value = res.link;
            urlInput.select();
            showAlert('success', '完成，请复制下方的链接！');
        } catch (err) {
            console.error('create failed:', err);
            showAlert('error', '抱歉，短链创建失败，请重试');
        } finally {
            submitBtn.disabled = false;
            submitBtn.classList.remove('loading');
        }
    });
});
