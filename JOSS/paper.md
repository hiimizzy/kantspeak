---
title: "KantSpeak: An Open-Source Experimental Framework for Adaptive Learning Research Using Contextual Bandits and Multimodal Interaction"

tags:
  - adaptive learning
  - human-computer interaction
  - contextual bandits
  - educational data mining
  - reproducible research

authors:
  - name: Isabela Araujo Costa
    affiliation: 1
    orcid: 0000-0002-9981-6343
  - name: Samya Rodrigues da Costa
    affiliation: 1
  - name: Carlos Henrique Guedes de Sousa
    affiliation: 1
  - name: Pedro Henrique Alves Ribeiro
    affiliation: 1

affiliations:
  - name: Universidade do Estado do Pará, Redenção, Brazil
    index: 1

date: 2026
bibliography: paper.bib
---

# Summary

KantSpeak is an open‑source experimental framework designed for research in adaptive learning systems and human–computer interaction (HCI). The framework enables reproducible experiments on adaptive task selection using behavioral metrics such as accuracy and response time in multimodal learning environments. Unlike conventional educational applications, KantSpeak is built as a research infrastructure that integrates experimental control, adaptive decision‑making, structured logging, and offline statistical analysis.

---

# Statement of Need

Research in adaptive learning systems requires reproducible and configurable environments to evaluate how users respond to different adaptation strategies. Existing educational tools typically implement proprietary or non‑transparent adaptation mechanisms, limiting reproducibility and experimental control. Moreover, many systems lack structured data pipelines suitable for scientific analysis.

KantSpeak addresses these limitations by providing a modular framework that supports:
- controlled experimental design;
- configurable adaptive policies;
- structured behavioral data logging;
- reproducible offline analysis.

This enables systematic evaluation of adaptive learning strategies under controlled conditions.

---

# Research Impact Statement

KantSpeak contributes to research in adaptive learning systems by providing a complete experimental pipeline that integrates interaction, adaptation, and analysis. The framework supports the evaluation of contextual bandit approaches and rule‑based adaptation strategies in multimodal learning tasks. By decoupling interface components from experimental logic, KantSpeak enables reproducible experimentation and comparative evaluation of adaptive algorithms across different conditions.

---

# System Architecture

KantSpeak is composed of five core components.

## 1. Logger

The Logger records all user interactions during experimental sessions, including:
- timestamps;
- event types;
- user responses;
- correctness;
- response time.

All data are stored in structured JSON format to ensure reproducibility.

## 2. ExperimentManager

The ExperimentManager controls experimental execution by:
- assigning participants to experimental groups;
- defining experimental conditions;
- managing session flow;
- aggregating performance metrics.

## 3. AdaptiveEngine

The AdaptiveEngine implements adaptive decision‑making strategies for task selection. Supported approaches include:
- contextual multi‑armed bandits (e.g., Thompson sampling);
- fuzzy rule‑based adaptation models.

The engine selects the next task based on observed user performance metrics such as accuracy and response time.

## 4. Instrument API

The system exposes HTTP endpoints that connect the front end with the experimental back end:
- `/instrument.php` – receives and stores interaction logs;
- `/adapt.php` – returns the next selected task based on the adaptive policy.

This separation ensures modularity between the user interface and the experimental logic.

## 5. Researcher Dashboard

The Researcher Dashboard provides a web‑based interface for data exploration and analysis, including:
- session‑level inspection;
- aggregated metrics per experimental group;
- export of structured logs;
- comparison between conditions.

Access is intended for research and analysis purposes.

---

# Adaptive Mechanism

The adaptive system computes a performance score based on:
- accuracy of responses;
- response time.

This score is used by the AdaptiveEngine to update task‑selection policies using either probabilistic bandit‑based methods or fuzzy rule‑based evaluation strategies. All parameters are configurable to support reproducible experimental designs.

---

# Data Collection and Reproducibility

KantSpeak ensures reproducibility through:
- structured JSON logging of all interactions;
- configurable experimental parameters;
- separation between user interface, experimental logic, and analysis layers;
- exportable datasets for offline evaluation.

These design choices enable full reconstruction of experimental sessions.

---

# Offline Analysis

The framework includes Python‑based tools for:
- descriptive statistics;
- hypothesis testing (t‑test, ANOVA);
- learning curve visualization;
- comparison between experimental groups.

---

# Software Design

KantSpeak is implemented using standard web technologies:
- HTML, CSS, JavaScript (front end);
- PHP (API layer);
- Python (analysis pipeline).

No proprietary dependencies are required, ensuring accessibility and reproducibility.

---

# Figures

![Main interface of KantSpeak showing available modules.](images/interface.png)

# AI Usage Disclosure

AI-based tools were used to generate visual assets for specific interface components (e.g., karaoke module). All generated content was reviewed and validated by the authors before integration into the system.

# References
