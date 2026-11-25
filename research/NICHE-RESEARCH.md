# 细分领域调研（2026-11-25）

> 方法：从 `dsh-plugin-catalog`（13,136 条）取全量目录，按关键词精确筛出候选，
> 再用本仓库的审计器逐个扫（文件数、版本数、周下载、红旗、域名）。
> **只读，不执行插件代码。**

## 0. 先给结论

**"弱供给"几乎等于"弱需求"。** 三个候选领域的头部周下载：语雀 182、腾讯文档 80、合同 210。
而同期"已被占满"的领域头部是 1,000–10,576/周。

也就是说：**没人做的地方，通常是没人要的地方**；真正拥挤的地方，才是有人愿意付时间的地方。

## 1. 文档平台接入

| 插件 | 周下载 | 版本 | 文件 | 备注 |
| --- | --- | --- | --- | --- |
| `dsh-obsidian` | 1,060 | 9 | 8 | Obsidian 本地库 |
| `obsidian-dsh-acp` | 496 | 27 | 60 | 走 ACP 暴露 |
| `dsh-obsidian-skills` | 410 | 5 | 25 | Obsidian skills 包 |
| `dsh-requirement-dev-workbench` | 1,688 | 10 | 7 | 飞书多维表格 + 任务流水线 |
| `dsh-lark-minutes-dashboard` | 244 | 2 | 8 | 飞书妙记 → 文档 |
| `dsh-notion-oauth-ui` | 364 | 2 | 17 | Notion OAuth |
| `dsh-notion-mcp` | 168 | 2 | 7 | Notion MCP |
| `dsh-yuque-kb` | 182 | 2 | 26 | 语雀当外部记忆 |
| `@hs666-ai/dsh-tencent-docs-bridge` | 80 | 6 | 16 | 腾讯文档桥 |
| `dsh-plugin-yuque-notes` | 34 | 3 | 10 | 对话提炼成语雀笔记 |
| `dsh-plugin-yuque` | 10 | 1 | 36 | 语雀 OpenAPI 工具 |

**判断**：Obsidian 有真实需求（1,000+/周）且已有 3 个实现；
语雀/腾讯文档确实弱（10–182/周），但**弱到说明需求本身窄**。

## 2. 发票 / 财务

| 插件 | 周下载 | 说明 |
| --- | --- | --- |
| `dsh-reference-session-collector` | 10,576 | 会话投影（非财务，关键词误入） |
| `dsh-ai-credits` | 1,661 | 各厂商额度/价格聚合 |
| `@dhr2333/dsh-ledger` | 1,436 | 本地纯文本复式账本（Beancount） |
| `dsh-te` / `dsh-te-cost` / `dsh-te-core` | 1,094 / 1,324 / 1,330 | token 计费拆解 |
| `dsh-go-aliyun-quota` | 1,358 | 阿里云额度面板 |
| **`dsh-invoice-check`** | **814** | **中文电子发票字段校验（税号等）** |
| `@vacum972/dsh-usage-billing` | 276 | 会话账单 |
| `dsh-wealth` | 131 | 券商/基金账本 |

**判断**：**这条不是空白，反而挺满**。发票校验、账本、成本核算都有人做，且下载量过千。

## 3. 法律 / 合同

| 插件 | 周下载 | 文件 | 说明 |
| --- | --- | --- | --- |
| `dsh-mont-bidcopilot` | 416 | 35 | 招投标文档起草 |
| `@liuhange/dsh-contract-redline` | 210 | **5** | 合同风险快扫（小企业） |
| `dsh-plugin-zhixing-ark-erp` | 223 | 7 | ERP 履约/合同查询 |
| `@liuhange/dsh-gov-doc-router` | 184 | 5 | 政务公文格式校验（GB/T 9704） |
| `dsh-thesis` | 788 | 220 | 论文/答辩 |
| `@58catmiao/dsh-sciwork` | 469 | 105 | 科研工作台（**命中高危：破坏性命令**） |

**判断**：有零星实现，但**都极浅**（合同风险扫描只有 5 个文件）。
不过下载量同样只有 200–400/周——**深度不足 + 需求窄**，两头都不占优。

## 4. 方法论教训

1. **用下载量做需求代理指标**，不要用"条目数少"当机会。条目少可能是没人要。
2. **高下载 + 低质量**才是真正值得进的位置（例如 10,576/周却无测试的会话投影器），
   但这类位置要靠"明显更好"才能抢，不是靠"我也做了一个"。
3. 13,136 个插件里，任何**单点功能**都已有 1–7 个实现；差异化只能来自
   **数据、深度、维护强度**，而不是"功能列表多一项"。

## 5. 附带发现（可直接用于审计报告）

- `@58catmiao/dsh-sciwork@0.4.10`：命中 **high:destructive-ops**（科研工作台里出现破坏性命令）
- `dsh-lark-minutes-dashboard`：**无 license**
- `dsh-plugin-spec`：**package.json 无 dsh 字段**（不是 DSH 插件）
- 12 个 docs/legal 候选里，**0 个发布包内含测试文件**
