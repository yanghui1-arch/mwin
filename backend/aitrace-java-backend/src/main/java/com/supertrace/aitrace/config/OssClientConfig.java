package com.supertrace.aitrace.config;

import com.aliyun.oss.OSS;
import com.aliyun.oss.OSSClientBuilder;

public final class OssClientConfig {
    private OssClientConfig() {
    }

    public static OSS createClient(String endpoint, String accessKeyId, String accessKeySecret) {
        return new OSSClientBuilder().build(endpoint, accessKeyId, accessKeySecret);
    }
}
