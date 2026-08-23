package com.supertrace.aitrace.repository;

import com.supertrace.aitrace.domain.core.storage.S3CompatibleObject;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface S3CompatibleObjectRepository extends JpaRepository<S3CompatibleObject, String> {
}
