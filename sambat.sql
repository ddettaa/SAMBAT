--
-- PostgreSQL database dump
--

\restrict o3POivhXb5taWp0swjQ9bZ5M2ulW8Cn0iBTSs3ZDrCocCGeDKCbdv7B6gHtVLEx

-- Dumped from database version 16.14 (Ubuntu 16.14-0ubuntu0.24.04.1)
-- Dumped by pg_dump version 16.14 (Ubuntu 16.14-0ubuntu0.24.04.1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pg_trgm; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;


--
-- Name: EXTENSION pg_trgm; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pg_trgm IS 'text similarity measurement and index searching based on trigrams';


--
-- Name: postgis; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA public;


--
-- Name: EXTENSION postgis; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION postgis IS 'PostGIS geometry and geography spatial types and functions';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: api_keys; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.api_keys (
    id text NOT NULL,
    role text NOT NULL,
    name text NOT NULL,
    key_hash text NOT NULL,
    expires_at timestamp with time zone,
    revoked_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by text NOT NULL,
    CONSTRAINT api_keys_role_check CHECK ((role = ANY (ARRAY['collector'::text, 'operator'::text, 'dinas'::text])))
);


--
-- Name: audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_log (
    id text NOT NULL,
    action text NOT NULL,
    entity_type text NOT NULL,
    entity_id text NOT NULL,
    actor text NOT NULL,
    detail jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: cases; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cases (
    id text NOT NULL,
    title text NOT NULL,
    report_ids jsonb DEFAULT '[]'::jsonb NOT NULL,
    report_count integer DEFAULT 1 NOT NULL,
    centroid public.geometry(Point,4326),
    score integer DEFAULT 0 NOT NULL,
    category text NOT NULL,
    status text DEFAULT 'terverifikasi'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: collector_inbox; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.collector_inbox (
    id text NOT NULL,
    source text NOT NULL,
    source_ref text,
    text text NOT NULL,
    location_text text,
    latitude double precision,
    longitude double precision,
    reporter_pseudo text,
    status text DEFAULT 'pending'::text NOT NULL,
    error text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT collector_inbox_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'ingested'::text, 'failed'::text]))),
    CONSTRAINT collector_inbox_text_check CHECK (((char_length(text) >= 3) AND (char_length(text) <= 5000)))
);


--
-- Name: dinas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dinas (
    id text NOT NULL,
    name text NOT NULL,
    short text NOT NULL
);


--
-- Name: geo_admin; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.geo_admin (
    name text NOT NULL,
    kind text NOT NULL,
    parent text,
    geom public.geometry(MultiPolygon,4326) NOT NULL
);


--
-- Name: geo_flood; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.geo_flood (
    kelurahan text NOT NULL,
    flood_urgency integer NOT NULL,
    potensi integer,
    kerentanan integer,
    keterpapar integer,
    resiko_iklim integer,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id text NOT NULL,
    report_id text NOT NULL,
    channel text NOT NULL,
    recipient text NOT NULL,
    subject text NOT NULL,
    body text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reports (
    id text NOT NULL,
    source text NOT NULL,
    source_ref text,
    text_original text NOT NULL,
    text_normalized text,
    category text DEFAULT 'lainnya'::text NOT NULL,
    location_text text,
    geom public.geometry(Point,4326),
    confidence real,
    status text DEFAULT 'terdeteksi'::text NOT NULL,
    priority integer DEFAULT 0 NOT NULL,
    priority_detail jsonb,
    reporter_pseudo text,
    dinas_id text,
    sla_due timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT reports_status_check CHECK ((status = ANY (ARRAY['terdeteksi'::text, 'terverifikasi'::text, 'diteruskan'::text, 'dikerjakan'::text, 'menunggu_konfirmasi'::text, 'selesai'::text, 'ditolak'::text])))
);


--
-- Name: sla_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sla_events (
    id text NOT NULL,
    report_id text NOT NULL,
    status text NOT NULL,
    note text,
    actor text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id text NOT NULL,
    role text NOT NULL,
    dinas_id text,
    name text,
    phone text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT users_role_check CHECK ((role = ANY (ARRAY['warga'::text, 'dinas'::text, 'operator'::text])))
);


--
-- Data for Name: api_keys; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.api_keys (id, role, name, key_hash, expires_at, revoked_at, created_at, created_by) FROM stdin;
env-collector	collector	collector-env	d31b47dc87b7fac92eedb0a6f6250d3b9da90eac36a5e1806d09fef2418667b9	\N	\N	2026-08-07 22:46:26.008574+00	bootstrap
env-operator	operator	operator-env	5fcbbb6c998ba4f32e256386210a8494652b92cdfa3bb5acc3d71fd3b0842293	\N	\N	2026-08-07 22:46:26.011266+00	bootstrap
env-dinas	dinas	dinas-env	2c7930b9be66799e91a7ed7b220e3d0b8134b6e79363c502dbfbf60e7b3a7860	\N	\N	2026-08-07 22:46:26.013277+00	bootstrap
\.


--
-- Data for Name: audit_log; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.audit_log (id, action, entity_type, entity_id, actor, detail, created_at) FROM stdin;
\.


--
-- Data for Name: cases; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cases (id, title, report_ids, report_count, centroid, score, category, status, created_at) FROM stdin;
\.


--
-- Data for Name: collector_inbox; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.collector_inbox (id, source, source_ref, text, location_text, latitude, longitude, reporter_pseudo, status, error, created_at) FROM stdin;
\.


--
-- Data for Name: dinas; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.dinas (id, name, short) FROM stdin;
d-pupr	Dinas Pekerjaan Umum dan Penataan Ruang	PUPR
d-dlh	Dinas Lingkungan Hidup	DLH
d-dishub	Dinas Perhubungan	DISHUB
d-bpbd	Badan Penanggulangan Bencana Daerah	BPBD
\.


--
-- Data for Name: geo_admin; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.geo_admin (name, kind, parent, geom) FROM stdin;
\.


--
-- Data for Name: geo_flood; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.geo_flood (kelurahan, flood_urgency, potensi, kerentanan, keterpapar, resiko_iklim, updated_at) FROM stdin;
Basirih	7	7	7	5	6	2026-08-07 22:46:26.00539+00
Belitung Selatan	4	4	5	3	4	2026-08-07 22:46:26.00539+00
Mantuil	3	2	6	1	3	2026-08-07 22:46:26.00539+00
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.notifications (id, report_id, channel, recipient, subject, body, status, created_at) FROM stdin;
\.


--
-- Data for Name: reports; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.reports (id, source, source_ref, text_original, text_normalized, category, location_text, geom, confidence, status, priority, priority_detail, reporter_pseudo, dinas_id, sla_due, created_at) FROM stdin;
\.


--
-- Data for Name: sla_events; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.sla_events (id, report_id, status, note, actor, created_at) FROM stdin;
\.


--
-- Data for Name: spatial_ref_sys; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.spatial_ref_sys (srid, auth_name, auth_srid, srtext, proj4text) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, role, dinas_id, name, phone, created_at) FROM stdin;
\.


--
-- Name: api_keys api_keys_key_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_keys
    ADD CONSTRAINT api_keys_key_hash_key UNIQUE (key_hash);


--
-- Name: api_keys api_keys_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_keys
    ADD CONSTRAINT api_keys_pkey PRIMARY KEY (id);


--
-- Name: audit_log audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_pkey PRIMARY KEY (id);


--
-- Name: cases cases_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cases
    ADD CONSTRAINT cases_pkey PRIMARY KEY (id);


--
-- Name: collector_inbox collector_inbox_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collector_inbox
    ADD CONSTRAINT collector_inbox_pkey PRIMARY KEY (id);


--
-- Name: collector_inbox collector_inbox_source_source_ref_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collector_inbox
    ADD CONSTRAINT collector_inbox_source_source_ref_key UNIQUE (source, source_ref);


--
-- Name: dinas dinas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dinas
    ADD CONSTRAINT dinas_pkey PRIMARY KEY (id);


--
-- Name: dinas dinas_short_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dinas
    ADD CONSTRAINT dinas_short_key UNIQUE (short);


--
-- Name: geo_admin geo_admin_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.geo_admin
    ADD CONSTRAINT geo_admin_pkey PRIMARY KEY (name);


--
-- Name: geo_flood geo_flood_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.geo_flood
    ADD CONSTRAINT geo_flood_pkey PRIMARY KEY (kelurahan);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: reports reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_pkey PRIMARY KEY (id);


--
-- Name: sla_events sla_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sla_events
    ADD CONSTRAINT sla_events_pkey PRIMARY KEY (id);


--
-- Name: users users_phone_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_phone_key UNIQUE (phone);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: idx_api_keys_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_api_keys_active ON public.api_keys USING btree (role, revoked_at, expires_at);


--
-- Name: idx_cases_centroid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cases_centroid ON public.cases USING gist (centroid);


--
-- Name: idx_cases_geom; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cases_geom ON public.cases USING gist (centroid);


--
-- Name: idx_geo_admin_geom; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_geo_admin_geom ON public.geo_admin USING gist (geom);


--
-- Name: idx_reports_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reports_category ON public.reports USING btree (category);


--
-- Name: idx_reports_geom; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reports_geom ON public.reports USING gist (geom);


--
-- Name: idx_reports_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reports_status ON public.reports USING btree (status);


--
-- Name: idx_reports_trgm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reports_trgm ON public.reports USING gin (text_normalized public.gin_trgm_ops);


--
-- Name: notifications notifications_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.reports(id) ON DELETE CASCADE;


--
-- Name: reports reports_dinas_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_dinas_id_fkey FOREIGN KEY (dinas_id) REFERENCES public.dinas(id);


--
-- Name: sla_events sla_events_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sla_events
    ADD CONSTRAINT sla_events_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.reports(id);


--
-- Name: users users_dinas_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_dinas_id_fkey FOREIGN KEY (dinas_id) REFERENCES public.dinas(id);


--
-- PostgreSQL database dump complete
--

\unrestrict o3POivhXb5taWp0swjQ9bZ5M2ulW8Cn0iBTSs3ZDrCocCGeDKCbdv7B6gHtVLEx

