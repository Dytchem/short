/*
 * Copyright (c) molikai-work (2024)
 * molikai-work 的特定修改和新增部分
 * 根据 MIT 许可证发布
 *
 * 2026-11-22 安全加固（Dytchem）：
 * - 随机 slug 改用 crypto.getRandomValues（拒绝采样，无模偏差）
 * - 密码改 PBKDF2-SHA256 + 随机盐存储；兼容校验旧的无盐 SHA-256 存量哈希
 * - 新增 HTML 转义助手，供跳转页拼接用户可控 URL/slug 时使用
 */

// functions/utils.js

// 短网址名称
export const shortName = `Dytchem 短网址`;

// 正常 Api 跨域请求允许域
export const allowOrigin = "*"

// 代理 Api 跨域请求允许域
export const allowProxyOrigin = "*"

// 随机 slug 位数 (包括固定前缀)
export const initialLength = 6;

// 特定域名列表，可根据需要来取消注释或是添加、删改
export const specialDomains = [
    "eu.org",
    "us.kg",
//    "pp.ua",
//    "rr.nu",
    "pages.dev",
//    "workers.dev",
    "github.io"
];

// 联系人邮箱
export const adminEmail = `Dytchem@qq.com`;

// 跳转页 Head 块
export const htmlHead = `<!-- Head -->
<meta charset="UTF-8" />
<link rel="icon" href="/favicon.ico" />
<meta name="robots" content="noindex, nofollow" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<link rel="stylesheet" rel="preload" href="/css/jump-styles.css" as="style" />`;

// 跳转页 No Script 提示
export const noscript = `<!-- Noscript -->
<noscript>
    <p>注意：完整使用 ${shortName}需要浏览器支持（启用）JavaScript！</p>
    <p>此页面（短链跳转）也可以在不运行 JavaScript 的情况下使用，请手动操作页面。</p>
</noscript>`;

// 跳转页 Footer 块
export const footer = `<!-- Footer -->
<hr />`;

// HTML 转义：凡是把用户可控字符串（目标 URL、slug 等）拼进 HTML 前都必须先过这里
export function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// 生成随机字符串 slug（密码学安全随机源）
export function generatePrefixedRandomSlug(length) {
    const characters = '1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let result = '';

    // 将随机的首字符固定为 - 来区分随机和自定义
    result += "-";

    // 拒绝采样：只接受小于 limit 的字节，避免模偏差
    const limit = 256 - (256 % characters.length);
    while (result.length < length) {
        const buf = new Uint8Array(length * 2);
        crypto.getRandomValues(buf);
        for (const b of buf) {
            if (result.length >= length) break;
            if (b < limit) result += characters.charAt(b % characters.length);
        }
    }

    return result;
}

// 统一返回函数
export function createResponse(code, message, extraData = {}) {
    return Response.json({
        code: code,
        message: message,
        time: Date.now(),
        releases: 'v1.4.4-final',
        ...extraData
    }, {
        headers: corsHeaders,
        status: code
    });
}

// CORS 相关的响应头部信息
export const corsHeaders = {
    'Access-Control-Allow-Origin': `${allowOrigin}`,
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400'
};

// ---- 密码哈希 ----
// 新格式：pbkdf2:<iterations>:<saltHex>:<hashHex>（PBKDF2-SHA256，10 万次迭代，128 位随机盐）
const PBKDF2_ITERATIONS = 100000;

function toHex(bytes) {
    return Array.from(new Uint8Array(bytes))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

async function pbkdf2Hex(password, saltBytes, iterations) {
    const keyMaterial = await crypto.subtle.importKey(
        'raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits(
        { name: 'PBKDF2', salt: saltBytes, iterations, hash: 'SHA-256' },
        keyMaterial, 256);
    return toHex(bits);
}

// 旧格式：无盐 SHA-256 十六进制（仅用于校验存量短链密码）
async function legacySha256Hex(password) {
    const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password));
    return toHex(hash);
}

export async function hashPassword(password) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const hash = await pbkdf2Hex(password, salt, PBKDF2_ITERATIONS);
    return `pbkdf2:${PBKDF2_ITERATIONS}:${toHex(salt)}:${hash}`;
}

export function isLegacyHash(stored) {
    return typeof stored === 'string' && /^[0-9a-f]{64}$/.test(stored);
}

// 校验密码是否匹配存储值（同时支持新 PBKDF2 格式与旧 SHA-256 格式）
export async function verifyPasswordHash(password, stored) {
    if (typeof stored !== 'string' || !stored) return false;
    if (stored.startsWith('pbkdf2:')) {
        const parts = stored.split(':');
        if (parts.length !== 4) return false;
        const iterations = parseInt(parts[1], 10);
        if (!Number.isFinite(iterations) || iterations < 1 || iterations > 600000) return false;
        const saltBytes = new Uint8Array(parts[2].match(/.{2}/g).map(h => parseInt(h, 16)));
        const computed = await pbkdf2Hex(password, saltBytes, iterations);
        return computed === parts[3];
    }
    if (isLegacyHash(stored)) {
        return (await legacySha256Hex(password)) === stored;
    }
    return false;
}
