# DSH 插件审计（静态）

生成时间：2026-11-25T10:51:34.809Z

| 插件 | 等级 | 分数 | 主要发现 |
| --- | --- | --- | --- |
| `dsh-swarm-console`@0.6.3 | **A** | 90 | no-tests-in-package, touches-dsh-home, spawns-process |
| `@xiaoyuyu6420/dsh-backup`@0.14.4 | **A** | 86 | no-tests-in-package, touches-dsh-home, destructive-ops |
| `dsh-plugin-health`@3.3.0 | **A** | 92 | no-tests-in-package, touches-dsh-home, spawns-process |
| `dsh-cost-meter`@1.9.92 | **A** | 92 | no-tests-in-package, touches-dsh-home, spawns-process |
| `@jayyuen66/dsh-danger-guard`@0.1.21 | **A** | 92 | no-tests-in-package, destructive-ops |
| `dsh-isolation-gate`@1.13.13 | **A** | 90 | no-tests-in-package, touches-dsh-home, spawns-process |
| `dsh-doublecheck`@0.9.37 | **A** | 96 | no-tests-in-package, network-egress |
| `@bushizhanghan/dsh-publish-gate`@0.50.0 | **B** | 84 | no-tests-in-package, touches-dsh-home, spawns-process |
| `dsh-context`@0.87.1 | **A** | 94 | no-tests-in-package, touches-dsh-home, network-egress |
| `dsh-mnemon`@0.5.55 | **A** | 96 | no-tests-in-package, touches-dsh-home |
| `dsh-pet`@0.4.9 | **A** | 86 | no-tests-in-package, weak-readme, touches-dsh-home |
| `dsh-config-manager`@0.12.0 | **B** | 84 | no-tests-in-package, touches-dsh-home, destructive-ops |
| `dsh-review`@0.1.1 | **A** | 96 | no-tests-in-package, no-dsh-range |
| `dsh-plugin-catalog`@2026.1125.27413 | **B** | 78 | dsh-manifest, no-tests-in-package, weak-readme |
| `dsh-session-repair`@0.7.0 | **A** | 94 | no-tests-in-package, touches-dsh-home, no-dsh-range |
| `dsh-marketplace`@0.1.3 | **A** | 88 | no-tests-in-package, touches-dsh-home, spawns-process |

> 只读静态分析：不执行插件代码。发现项为**线索**，不是漏洞结论。