import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ProxyAgent, setGlobalDispatcher } from 'undici';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import process from 'process';

// ⚠️ 忽略 SSL 证书错误 (解决代理连接的关键)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TARGET_ENV_PATH = path.resolve(__dirname, '..', '.env');

dotenv.config({ path: TARGET_ENV_PATH });

// 配置代理（与主脚本一致）
function getEnvExplicit(keyName) {
  let val = process.env[keyName];
  if (!val && fs.existsSync(TARGET_ENV_PATH)) {
    try {
      const fileContent = fs.readFileSync(TARGET_ENV_PATH, 'utf-8');
      const regex = new RegExp(`(?:^|\\n)\\s*${keyName}\\s*=\\s*([^\\n\\r]+)`);
      const match = fileContent.match(regex);
      if (match && match[1]) val = match[1].trim().replace(/['"]/g, ''); 
    } catch (e) {}
  }
  return val;
}

const proxyEnv = getEnvExplicit('HTTPS_PROXY');
if (proxyEnv) {
  try {
    const dispatcher = new ProxyAgent({
        uri: proxyEnv,
        connect: { timeout: 30000 }
    });
    setGlobalDispatcher(dispatcher);
    console.log(`🔌 已启用全局网络代理: ${proxyEnv}\n`);
  } catch (e) {
    console.error(`⚠️ 代理设置失败: ${e.message}\n`);
  }
} else {
  console.log("⚠️ 未检测到 HTTPS_PROXY，连接可能会失败。\n");
}

const geminiKey = process.env.GEMINI_API_KEY;

if (!geminiKey) {
  console.error("❌ 错误: 找不到 GEMINI_API_KEY！请检查 .env 文件。");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(geminiKey);

// 测试的模型名称列表
const modelNames = [
  "gemini-1.5-pro",
  "gemini-pro",
  "gemini-1.5-flash",
  "gemini-2.0-flash-exp",
  "gemini-1.5-flash-latest"
];

console.log("🔍 测试可用的 Gemini 模型...\n");

for (const modelName of modelNames) {
  try {
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContent("Say 'Hello' in one word.");
    const response = await result.response;
    const text = response.text();
    console.log(`✅ ${modelName}: 可用 - 响应: "${text.trim()}"`);
  } catch (e) {
    const errorMsg = e.message || String(e);
    if (errorMsg.includes("404") || errorMsg.includes("not found")) {
      console.log(`❌ ${modelName}: 不可用 (404)`);
    } else {
      console.log(`⚠️  ${modelName}: 错误`);
      console.log(`   完整错误: ${errorMsg}`);
    }
  }
}

console.log("\n✅ 测试完成！");

