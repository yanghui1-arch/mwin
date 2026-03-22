create table api_key
(
    id           uuid default gen_random_uuid() not null
        constraint api_key_pk
            primary key,
    user_id      uuid                           not null,
    key          varchar(255)                   not null,
    created_time timestamp                      not null
);

alter table api_key
    owner to postgres;


create table eval_job
(
    id             uuid        not null
        primary key,
    created_at     timestamp(6),
    error_msg      text,
    job_type       varchar(10) not null
        constraint eval_job_job_type_check
            check ((job_type)::text = ANY ((ARRAY ['step'::character varying, 'trace'::character varying])::text[])),
    project_id     bigint      not null,
    retry_count    integer     not null,
    status         varchar(12) not null,
    step_id        uuid,
    trace_id       uuid,
    updated_at     timestamp(6),
    prompt_version varchar(255)
);

alter table eval_job
    owner to postgres;

create index idx_eval_job_status
    on eval_job (status);


create table eval_metric
(
    id              uuid         not null
        primary key,
    created_at      timestamp(6),
    description     text,
    judge_prompt    text,
    name            varchar(100) not null,
    project_id      bigint       not null,
    score_range_max numeric(7, 2),
    score_range_min numeric(7, 2),
    constraint uk7lgws79r4orse5gdy4psi2hbs
        unique (project_id, name)
);

alter table eval_metric
    owner to postgres;


create table eval_score
(
    id             uuid          not null
        primary key,
    created_at     timestamp(6),
    eval_metric_id uuid          not null,
    evaluated_by   uuid,
    evaluator_type varchar(20)   not null,
    reasoning      text,
    score          numeric(7, 2) not null,
    step_id        uuid,
    trace_id       uuid,
    prompt_version varchar(30)
);

alter table eval_score
    owner to postgres;


create table kubent_chat
(
    id              uuid      default gen_random_uuid() not null
        constraint kubent_chat_pk
            primary key,
    session_uuid    uuid                                not null,
    user_uuid       uuid                                not null,
    role            varchar(20)                         not null,
    payload         jsonb                               not null,
    agent_name      text      default 'Kubent'::text    not null,
    start_timestamp timestamp default CURRENT_TIMESTAMP not null
);

comment on table kubent_chat is 'User chats with an agent. Generally store the user chats only. Chats between agents are not stored in this table.';

comment on column kubent_chat.session_uuid is 'Chat session uuid';

comment on column kubent_chat.user_uuid is 'user uuid';

comment on column kubent_chat.role is 'Chat role';

comment on column kubent_chat.payload is 'LLM chat completion';

comment on column kubent_chat.start_timestamp is 'Chat created time';

comment on column kubent_chat.agent_name is 'Which agent chat with user';

alter table kubent_chat
    owner to postgres;

create table kubent_chat_session
(
    id                    uuid      default gen_random_uuid() not null
        constraint kubent_chat_record_pk
            primary key,
    user_uuid             uuid                                not null,
    title                 text,
    start_timestamp       timestamp default CURRENT_TIMESTAMP not null,
    last_update_timestamp timestamp default CURRENT_TIMESTAMP not null,
    total_tokens          integer
);

comment on table kubent_chat_session is 'Chat session with Kubent';

comment on column kubent_chat_session.id is 'chat session id';

comment on column kubent_chat_session.user_uuid is 'User uuid';

comment on column kubent_chat_session.title is 'Core of the whole chat. It''s a summary.';

alter table kubent_chat_session
    owner to postgres;

create table project
(
    id                    bigint generated always as identity
        constraint project_pk
            primary key,
    user_uuid             uuid                                     not null,
    name                  varchar(255)                             not null,
    created_timestamp     timestamp      default CURRENT_TIMESTAMP not null,
    avg_duration          integer        default 0                 not null,
    cost                  numeric(38, 6) default 0                 not null,
    last_update_timestamp timestamp      default CURRENT_TIMESTAMP not null,
    description           varchar(255),
    strategy              text
);

comment on table project is 'User project detail';

comment on column project.user_uuid is 'User owner uuid';

comment on column project.name is 'Project name';

comment on column project.created_timestamp is 'Project creation time';

comment on column project.avg_duration is 'This project trace average wait duration(ms)';

comment on column project.cost is 'Total llm cost of the project. Stored in US dollars';

comment on column project.last_update_timestamp is 'Project last update timestamp';

comment on column project.description is 'Project description. Words cannot exceed 255';

comment on column project.strategy is 'Project''s strategy which can be updated by llm or person.';

alter table project
    owner to postgres;


create table prompt
(
    id                 uuid                                            not null
        primary key,
    content            text                                            not null,
    created_at         timestamp(6),
    created_by         uuid,
    model_config       jsonb,
    prompt_pipeline_id uuid                                            not null,
    version            varchar(50)                                     not null,
    changelog          text,
    description        text,
    name               varchar(200),
    status             varchar(20) default 'active'::character varying not null,
    constraint ukdqclc817avtxdie5smw35jjxb
        unique (prompt_pipeline_id, version)
);

alter table prompt
    owner to postgres;


create table prompt_pipeline
(
    id          uuid                                            not null
        primary key,
    created_at  timestamp(6),
    description text,
    name        varchar(255)                                    not null,
    project_id  bigint                                          not null,
    status      varchar(20) default 'active'::character varying not null,
    constraint uk490bokkaaa693j76jkwk6va1p
        unique (project_id, name)
);

alter table prompt_pipeline
    owner to postgres;


create table prompt_status
(
    id              uuid         not null
        primary key,
    deployed_at     timestamp(6),
    deployed_by     uuid,
    prompt_id       uuid         not null,
    prompt_group_id uuid         not null,
    status          varchar(100) not null,
    constraint ukf2g6u5tyof7vpyt2g2ka4ki6g
        unique (prompt_group_id, status)
);

alter table prompt_status
    owner to postgres;


create table step
(
    id             uuid         default gen_random_uuid()                      not null
        constraint step_pk
            primary key,
    name           varchar(255) default 'default_step_name'::character varying not null,
    trace_id       uuid                                                        not null,
    parent_step_id uuid,
    type           varchar(255) default 'customized'::text                     not null,
    tags           jsonb        default '[]'::jsonb                            not null,
    input          jsonb,
    output         jsonb,
    error_info     varchar(255),
    model          varchar(255),
    project_name   varchar(255)                                                not null,
    usage          jsonb,
    start_time     timestamp    default CURRENT_TIMESTAMP                      not null,
    end_time       timestamp,
    project_id     bigint                                                      not null
);

alter table step
    owner to postgres;

create table step_meta
(
    id       uuid  not null
        constraint step_meta_pk
            primary key,
    metadata jsonb not null,
    cost     numeric(10, 6) default 0 not null
);

comment on table step_meta is 'It contains step metadata which is used for Kubent or other agents.';

comment on column step_meta.id is 'The id should be as the same as the step id.';

comment on column step_meta.metadata is 'Step metadata in details';

comment on column step_meta.cost is 'Step token usage cost';

alter table step_meta
    owner to postgres;


create table step_ref
(
    id             uuid not null
        primary key,
    prompt_id      uuid,
    prompt_version varchar(255)
);

alter table step_ref
    owner to postgres;


create table trace
(
    id                    uuid      default gen_random_uuid() not null
        constraint trace_pk
            primary key,
    project_name          varchar(255)                        not null,
    name                  varchar(255)                        not null,
    conversation_id       uuid      default gen_random_uuid() not null,
    tags                  jsonb     default '[]'::jsonb       not null,
    input                 jsonb     default '{}'::jsonb,
    output                jsonb     default '{}'::jsonb,
    error_info            varchar(255),
    start_time            timestamp default CURRENT_TIMESTAMP not null,
    last_update_timestamp timestamp,
    project_id            bigint                              not null
);

alter table trace
    owner to postgres;

create table user_auth
(
    id         uuid         not null
        constraint user_auth_pk
            primary key,
    user_uuid  uuid         not null,
    auth_type  varchar(255) not null,
    identifier varchar(255) not null,
    created_at timestamp    not null
);

comment on column user_auth.auth_type is 'Only support `password`, `github`, `google`';

comment on column user_auth.identifier is 'Only identifier';

alter table user_auth
    owner to postgres;

create table users
(
    id            uuid default gen_random_uuid() not null
        constraint users_pk
            primary key,
    email         varchar(255),
    username      varchar(255)                   not null,
    register_time timestamp                      not null,
    avatar        varchar(255)
);

alter table users
    owner to postgres;

