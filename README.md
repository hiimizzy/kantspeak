# KantSpeak

KantSpeak is an open‑source experimental framework for research in adaptive learning systems and human–computer interaction. It provides an infrastructure for designing, executing, and analyzing reproducible experiments on adaptive task selection in multimodal learning environments.

The system is **not** intended as an educational application, but as a research tool for controlled experimentation.

---

## Scientific Scope

KantSpeak supports research in:

- Adaptive learning systems
- Human–computer interaction (HCI)
- Educational data mining
- Reinforcement learning in education
- Assistive technologies for neurodivergent users

---

## System Architecture

KantSpeak is composed of five core modules:

### 1. Logger

Records all interaction events with structured metadata:

- Timestamp
- Event type
- User response
- Correctness
- Response time

All logs are stored in JSON format to ensure reproducibility.

### 2. ExperimentManager

Controls experimental execution:

- Assignment of participants to groups (e.g., control vs adaptive)
- Definition of experimental conditions
- Session management
- Aggregation of metrics

### 3. AdaptiveEngine

Implements adaptive decision‑making strategies:

- **Contextual Multi‑Armed Bandits (Thompson Sampling)** – selects the next task based on Beta‑distributed probabilities updated by successes/failures, optionally incorporating user context (age, support level).
- Rule‑based fuzzy adaptation models (planned).

The engine selects the next task based on observed performance metrics such as accuracy and response time.

### 4. Instrument API

HTTP endpoints for integration between frontend and experimental logic:

- `/instrument.php` – receives and stores interaction logs
- `/adapt.php` – returns the next adaptive action (recommended activity)

This separation ensures modularity between UI and research logic.

### 5. Researcher Dashboard

A web‑based interface for data analysis and visualization:

- Session inspection
- Aggregated metrics per experiment
- Export of logs (CSV/JSON)
- Comparison between experimental groups

---

## Installation

### Requirements

- Web server (XAMPP, WAMP, or PHP built‑in server)
- PHP 7.4+
- Modern browser (Chrome, Edge, Firefox) – camera and microphone required for some modules
- Python 3.8+ (for offline analysis)

### Quick Start

1. Clone the repository:
   ```bash
   git clone https://github.com/your-repo/kant_speak
   cd kant_speak
