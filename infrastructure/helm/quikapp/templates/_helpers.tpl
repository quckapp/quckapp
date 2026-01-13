{{/*
Expand the name of the chart.
*/}}
{{- define "quikapp.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
*/}}
{{- define "quikapp.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "quikapp.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "quikapp.labels" -}}
helm.sh/chart: {{ include "quikapp.chart" . }}
{{ include "quikapp.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/part-of: quikapp
{{- end }}

{{/*
Selector labels
*/}}
{{- define "quikapp.selectorLabels" -}}
app.kubernetes.io/name: {{ include "quikapp.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Service labels for a specific microservice
*/}}
{{- define "quikapp.serviceLabels" -}}
helm.sh/chart: {{ include "quikapp.chart" .root }}
app.kubernetes.io/name: {{ .serviceName }}
app.kubernetes.io/instance: {{ .root.Release.Name }}
{{- if .root.Chart.AppVersion }}
app.kubernetes.io/version: {{ .root.Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .root.Release.Service }}
app.kubernetes.io/part-of: quikapp
app.kubernetes.io/component: {{ .component | default "backend" }}
{{- end }}

{{/*
Service selector labels for a specific microservice
*/}}
{{- define "quikapp.serviceSelectorLabels" -}}
app.kubernetes.io/name: {{ .serviceName }}
app.kubernetes.io/instance: {{ .root.Release.Name }}
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "quikapp.serviceAccountName" -}}
{{- if .Values.global.serviceAccount.create }}
{{- default (include "quikapp.fullname" .) .Values.global.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.global.serviceAccount.name }}
{{- end }}
{{- end }}

{{/*
Generate image pull secrets
*/}}
{{- define "quikapp.imagePullSecrets" -}}
{{- if .Values.global.imagePullSecrets }}
imagePullSecrets:
{{- range .Values.global.imagePullSecrets }}
  - name: {{ . }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Generate the full image name for a service
*/}}
{{- define "quikapp.image" -}}
{{- $registry := .root.Values.global.imageRegistry | default "" -}}
{{- $repository := .image.repository -}}
{{- $tag := .image.tag | default "latest" -}}
{{- if $registry -}}
{{- printf "%s/%s:%s" $registry $repository $tag -}}
{{- else -}}
{{- printf "%s:%s" $repository $tag -}}
{{- end -}}
{{- end }}

{{/*
Generate resource limits and requests
*/}}
{{- define "quikapp.resources" -}}
{{- if .resources }}
resources:
  {{- if .resources.requests }}
  requests:
    {{- if .resources.requests.cpu }}
    cpu: {{ .resources.requests.cpu }}
    {{- end }}
    {{- if .resources.requests.memory }}
    memory: {{ .resources.requests.memory }}
    {{- end }}
  {{- end }}
  {{- if .resources.limits }}
  limits:
    {{- if .resources.limits.cpu }}
    cpu: {{ .resources.limits.cpu }}
    {{- end }}
    {{- if .resources.limits.memory }}
    memory: {{ .resources.limits.memory }}
    {{- end }}
  {{- end }}
{{- else if .global.resources }}
resources:
  {{- toYaml .global.resources | nindent 2 }}
{{- end }}
{{- end }}

{{/*
Generate health check probes
*/}}
{{- define "quikapp.probes" -}}
{{- if .healthCheck }}
livenessProbe:
  httpGet:
    path: {{ .healthCheck.path }}
    port: {{ .healthCheck.port }}
  initialDelaySeconds: {{ .healthCheck.initialDelaySeconds | default 30 }}
  periodSeconds: {{ .healthCheck.periodSeconds | default 10 }}
  timeoutSeconds: {{ .healthCheck.timeoutSeconds | default 5 }}
  failureThreshold: {{ .healthCheck.failureThreshold | default 3 }}
readinessProbe:
  httpGet:
    path: {{ .healthCheck.path }}
    port: {{ .healthCheck.port }}
  initialDelaySeconds: {{ .healthCheck.initialDelaySeconds | default 10 }}
  periodSeconds: {{ .healthCheck.periodSeconds | default 5 }}
  timeoutSeconds: {{ .healthCheck.timeoutSeconds | default 3 }}
  failureThreshold: {{ .healthCheck.failureThreshold | default 3 }}
startupProbe:
  httpGet:
    path: {{ .healthCheck.path }}
    port: {{ .healthCheck.port }}
  initialDelaySeconds: {{ .healthCheck.startupInitialDelaySeconds | default 5 }}
  periodSeconds: {{ .healthCheck.startupPeriodSeconds | default 5 }}
  timeoutSeconds: {{ .healthCheck.startupTimeoutSeconds | default 3 }}
  failureThreshold: {{ .healthCheck.startupFailureThreshold | default 30 }}
{{- end }}
{{- end }}

{{/*
Generate environment variables from env map
*/}}
{{- define "quikapp.env" -}}
{{- if .env }}
env:
{{- range $key, $value := .env }}
  - name: {{ $key }}
    value: {{ $value | quote }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Generate environment variables from secrets and configmaps
*/}}
{{- define "quikapp.envFrom" -}}
{{- if .envFrom }}
envFrom:
{{- toYaml .envFrom | nindent 2 }}
{{- end }}
{{- end }}

{{/*
Pod security context
*/}}
{{- define "quikapp.podSecurityContext" -}}
{{- if .securityContext }}
securityContext:
  {{- toYaml .securityContext | nindent 2 }}
{{- else if .global.podSecurityContext }}
securityContext:
  {{- toYaml .global.podSecurityContext | nindent 2 }}
{{- end }}
{{- end }}

{{/*
Container security context
*/}}
{{- define "quikapp.containerSecurityContext" -}}
{{- if .containerSecurityContext }}
securityContext:
  {{- toYaml .containerSecurityContext | nindent 2 }}
{{- else if .global.securityContext }}
securityContext:
  {{- toYaml .global.securityContext | nindent 2 }}
{{- end }}
{{- end }}

{{/*
Namespace
*/}}
{{- define "quikapp.namespace" -}}
{{- .Values.global.namespace | default .Release.Namespace -}}
{{- end }}

{{/*
Generate tracing environment variables
*/}}
{{- define "quikapp.tracingEnv" -}}
{{- if .global.tracing.enabled }}
- name: OTEL_EXPORTER_OTLP_ENDPOINT
  value: {{ .global.tracing.endpoint | quote }}
- name: OTEL_TRACES_SAMPLER
  value: "parentbased_traceidratio"
- name: OTEL_TRACES_SAMPLER_ARG
  value: {{ .global.tracing.samplingRatio | quote }}
- name: OTEL_SERVICE_NAME
  value: {{ .serviceName | quote }}
- name: OTEL_RESOURCE_ATTRIBUTES
  value: "service.name={{ .serviceName }},service.namespace=quikapp,deployment.environment={{ .global.environment }}"
{{- end }}
{{- end }}

{{/*
Generate logging environment variables
*/}}
{{- define "quikapp.loggingEnv" -}}
- name: LOG_LEVEL
  value: {{ .global.logging.level | quote }}
- name: LOG_FORMAT
  value: {{ .global.logging.format | quote }}
{{- end }}

{{/*
Common annotations for deployments
*/}}
{{- define "quikapp.deploymentAnnotations" -}}
checksum/config: {{ include (print $.Template.BasePath "/configmap.yaml") . | sha256sum }}
checksum/secret: {{ include (print $.Template.BasePath "/secret.yaml") . | sha256sum }}
{{- end }}

{{/*
Pod annotations including Prometheus scrape config
*/}}
{{- define "quikapp.podAnnotations" -}}
prometheus.io/scrape: "true"
prometheus.io/port: {{ .port | quote }}
prometheus.io/path: {{ .metricsPath | default "/metrics" | quote }}
{{- end }}
