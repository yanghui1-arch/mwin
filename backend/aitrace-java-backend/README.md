# aitrace-java-backend
aitrace-java-backend module is the web backend of java version. It focus on collecting steps, traces, conversations and other data such as user acount, api key, usage and more. The agent arch improvement is not supported by java backend. AITrace team prefer to use python to implement it. So there is no AI implementation in this module.

Step and Trace input/output payloads are gzip-compressed and stored in Alibaba
OSS. Standalone Steps and Traces use the v2 single-payload format. Steps received
through `/log/trace_tree` are stored in fixed chunks of 16 using
`mwin.step-payload-chunk/v3`; each Step row keeps the shared chunk object key.

# Env
- Java 17
- PostgreSQL 18.0.2
- Redis 7.4.2
## Recommend Editor
IntelliJ IDEA 2024.3
