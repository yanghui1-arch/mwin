package com.supertrace.aitrace.exception.project;

public class DuplicateProjectNameException extends RuntimeException {
    private static final String DUPLICATE_PROJECT_NAME =
        "This project name is already being used. Please choose another project name.";

    public DuplicateProjectNameException() {
        super(DUPLICATE_PROJECT_NAME);
    }
}
