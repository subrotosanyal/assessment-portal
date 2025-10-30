# System Design Assignment

## Problem
You will design an architecture for **fine-grain cost tracking** and **multi-tenancy** in the platform (a SaaS solution for tele medicine portal deployed as microservices on EKS). The design should reflect realistic engineering, compliance, and operational considerations.

### Scenario 1: Fine-grain Cost Tracking
- Track and allocate costs per customer (tenant) across compute, storage, data transfer, and third-party APIs.
- Enable showback/chargeback reporting.
- Describe data sources for metrics, aggregation pipelines, and invoice reconciliation.
- Consider shared resources (e.g., caching, background tasks).

### Scenario 2: Multi-Tenancy
- Design tenant isolation models for data, IAM, and infrastructure.
- Handle tenant lifecycle (provisioning, suspend, delete, recovery).
- Incorporate compliance (HIPAA, GDPR).
- Optimize cost and maintain observability, alerts, and scalability.

## What to Submit
Submit a ZIP containing **exactly one** of the following at its root:
```
design.pdf
OR
design.pptx
```

The document must include:
1. Executive summary and goals.
2. Architecture diagrams for both scenarios.
3. Data flow for cost tracking.
4. Compliance and security controls.
5. Monitoring and operational plan.
6. Cost model formulas and reconciliation logic.
7. Tradeoffs and risks.

## Scoring
| Category | Points |
|-----------|--------|
| Structure & Validity | 10 |
| Executive Summary | 10 |
| Cost Tracking Architecture | 15 |
| Multi-Tenancy Architecture | 15 |
| Security & Compliance | 15 |
| Cost Model & Math | 15 |
| Operations | 10 |
| Tradeoffs & Risks | 10 |

**Total:** 100 points
