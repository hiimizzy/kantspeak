<?php
ini_set('display_errors', 0);
error_reporting(E_ALL);
session_start();

require_once __DIR__ . '/core/SessionManager.php';
require_once __DIR__ . '/core/Atividade.php';

// Carrega todas as atividades
require_once __DIR__ . '/activities/Alphabet.php';
require_once __DIR__ . '/activities/Listen.php';
require_once __DIR__ . '/activities/Speak.php';
require_once __DIR__ . '/activities/Write.php';
require_once __DIR__ . '/activities/TimeTrial.php';

$session = new SessionManager();

// ========== DADOS ==========
$palavras = [
    ["word" => "APPLE", "emoji" => "🍎", "translation" => "maçã"],
    ["word" => "DOG",   "emoji" => "🐕", "translation" => "cachorro"],
    ["word" => "SUN",   "emoji" => "☀️", "translation" => "sol"],
    ["word" => "HOUSE", "emoji" => "🏠", "translation" => "casa"],
    ["word" => "CAT",   "emoji" => "🐱", "translation" => "gato"],
    ["word" => "CAR",   "emoji" => "🚗", "translation" => "carro"],
    ["word" => "BIRD",  "emoji" => "🐦", "translation" => "pássaro"],
    ["word" => "FISH",  "emoji" => "🐠", "translation" => "peixe"],
    ["word" => "BOOK",  "emoji" => "📚", "translation" => "livro"],
    ["word" => "STAR",  "emoji" => "⭐", "translation" => "estrela"]
];

$letras = range('A', 'Z');

$vocabulary = [
    ["word" => "CAT", "emoji" => "🐱"],
    ["word" => "DOG", "emoji" => "🐕"],
    ["word" => "SUN", "emoji" => "☀️"],
    ["word" => "APPLE", "emoji" => "🍎"],
    ["word" => "CAR", "emoji" => "🚗"],
    ["word" => "BIRD", "emoji" => "🐦"],
    ["word" => "FISH", "emoji" => "🐠"],
    ["word" => "STAR", "emoji" => "⭐"],
    ["word" => "HOUSE", "emoji" => "🏠"],
    ["word" => "BOOK", "emoji" => "📚"]
];

$activities = [
    'alphabet'   => new Alphabet($letras, $session),
    'listen'     => new Listen($palavras, $session),
    'speak'      => new Speak($palavras, $session),
    'write'      => new Write($palavras, $session),
    'timetrial'  => new TimeTrial($vocabulary, $session)
];

header('Content-Type: application/json');

$action   = $_POST['action'] ?? $_GET['action'] ?? '';
$activity = $_POST['activity'] ?? $_GET['activity'] ?? '';

// ========== AÇÕES PÚBLICAS (NÃO PRECISAM DE ACTIVITY) ==========
$actionsWithoutActivity = ['get_researcher_data', 'export_logs', 'upload_experiment', 'getScore', 'get_experiment_group'];

if (!$action) {
    http_response_code(400);
    echo json_encode(['error' => 'Ação inválida']);
    exit;
}

if (in_array($action, $actionsWithoutActivity, true)) {
    // Não exige activity
} else {
    // Ações que precisam de activity
    if (!$activity || !isset($activities[$activity])) {
        http_response_code(400);
        echo json_encode(['error' => 'Atividade inválida: ' . $activity]);
        exit;
    }
    $act = $activities[$activity];
}


try {
    switch ($action) {
        // ----- Ações públicas -----
        case 'getScore':
            echo json_encode(['score' => $session->getScore()]);
            break;

        case 'get_experiment_group':
            $expFile = __DIR__ . '/data/experiments/active.json';
            if (file_exists($expFile)) {
                $exp = json_decode(file_get_contents($expFile), true);
                $hash = crc32(session_id()) % 100;
                $group = 'control';
                foreach ($exp['groups'] as $g => $range) {
                    if ($hash >= $range[0] && $hash < $range[1]) {
                        $group = $g;
                        break;
                    }
                }
                echo json_encode(['group' => $group, 'experiment_name' => $exp['name']]);
            } else {
                echo json_encode(['group' => null]);
            }
            break;

        case 'get_researcher_data':
            $logFiles = glob(__DIR__ . '/data/sessions/*.json');
            $totalSessions = count($logFiles);
            $allEvents = [];
            foreach ($logFiles as $file) {
                $events = json_decode(file_get_contents($file), true);
                if (is_array($events)) $allEvents = array_merge($allEvents, $events);
            }

            $activityStats = [];
            foreach ($allEvents as $ev) {
                $actName = $ev['activity'];
                if (!isset($activityStats[$actName])) $activityStats[$actName] = ['total' => 0, 'correct' => 0, 'times' => []];
                if ($ev['event'] === 'check') {
                    $activityStats[$actName]['total']++;
                    if ($ev['data']['correct'] ?? false) $activityStats[$actName]['correct']++;
                }
                if (isset($ev['data']['reactionTime'])) {
                    $activityStats[$actName]['times'][] = $ev['data']['reactionTime'];
                }
            }

            $byActivity = [];
            foreach ($activityStats as $actName => $stat) {
                $accuracy = $stat['total'] > 0 ? ($stat['correct'] / $stat['total']) * 100 : 0;
                $avgTime = count($stat['times']) > 0 ? array_sum($stat['times']) / count($stat['times']) : 0;
                $byActivity[] = ['activity' => $actName, 'accuracy' => $accuracy, 'avg_time' => $avgTime];
            }

            $groupComparison = [];
            $expConfig = json_decode(file_get_contents(__DIR__ . '/data/experiments/active.json'), true);
            if ($expConfig) {
                $groupScores = [];
                foreach ($allEvents as $ev) {
                    $group = $ev['data']['experiment_group'] ?? 'unknown';
                    if (!isset($groupScores[$group])) $groupScores[$group] = ['sum' => 0, 'count' => 0];
                    if ($ev['event'] === 'check' && isset($ev['data']['points'])) {
                        $groupScores[$group]['sum'] += $ev['data']['points'];
                        $groupScores[$group]['count']++;
                    }
                }
                foreach ($groupScores as $g => $sc) {
                    $groupComparison[] = ['group' => $g, 'avg_score' => $sc['count'] > 0 ? $sc['sum'] / $sc['count'] : 0];
                }
            }

            echo json_encode([
                'success' => true,
                'total_sessions' => $totalSessions,
                'avg_accuracy' => array_sum(array_column($byActivity, 'accuracy')) / max(1, count($byActivity)),
                'avg_response_time' => array_sum(array_column($byActivity, 'avg_time')) / max(1, count($byActivity)),
                'by_activity' => $byActivity,
                'group_comparison' => $groupComparison,
                'recent_logs' => array_slice($allEvents, -50),
                'active_experiment' => $expConfig
            ]);
            break;

        case 'export_logs':
            $format = $_GET['format'] ?? 'csv';
            $logFiles = glob(__DIR__ . '/data/sessions/*.json');
            $allEvents = [];
            foreach ($logFiles as $file) {
                $events = json_decode(file_get_contents($file), true);
                if (is_array($events)) $allEvents = array_merge($allEvents, $events);
            }
            if ($format === 'csv') {
                header('Content-Type: text/csv');
                header('Content-Disposition: attachment; filename="kantspeak_logs.csv"');
                $out = fopen('php://output', 'w');
                fputcsv($out, ['timestamp', 'session', 'activity', 'event', 'data']);
                foreach ($allEvents as $ev) {
                    fputcsv($out, [$ev['timestamp'], $ev['session'], $ev['activity'], $ev['event'], json_encode($ev['data'])]);
                }
                fclose($out);
            } else {
                header('Content-Type: application/json');
                echo json_encode($allEvents, JSON_PRETTY_PRINT);
            }
            break;

        case 'upload_experiment':
            if (isset($_FILES['experiment_config']) && $_FILES['experiment_config']['error'] === UPLOAD_ERR_OK) {
                $content = file_get_contents($_FILES['experiment_config']['tmp_name']);
                $json = json_decode($content, true);
                if ($json) {
                    file_put_contents(__DIR__ . '/data/experiments/active.json', $content);
                    echo json_encode(['success' => true]);
                } else {
                    echo json_encode(['success' => false, 'error' => 'Arquivo JSON inválido']);
                }
            } else {
                echo json_encode(['success' => false, 'error' => 'Nenhum arquivo enviado']);
            }
            break;

        // ----- Ações que precisam de activity -----
        case 'getItem':
            $item = $act->getCurrentItem();
            echo json_encode(['success' => true, 'item' => $item]);
            break;

        case 'check':
            $resposta = $_POST['resposta'] ?? '';
            $act->process(['resposta' => $resposta]);
            $feedback = $session->getFeedbackAndClear();
            $score = $session->getScore();

            // Atualiza contexto (opcional)
            $sessionId = session_id();
            $contextFile = __DIR__ . "/data/context/{$sessionId}.json";
            if (file_exists($contextFile)) {
                $context = json_decode(file_get_contents($contextFile), true);
                $isCorrect = strpos($feedback, 'Acertou') !== false;
                if (!isset($context['activities'][$activity])) {
                    $context['activities'][$activity] = ['success' => 0, 'failure' => 0];
                }
                if ($isCorrect) {
                    $context['activities'][$activity]['success']++;
                } else {
                    $context['activities'][$activity]['failure']++;
                }
                $context['last_update'] = time();
                file_put_contents($contextFile, json_encode($context, JSON_PRETTY_PRINT));
            }

            echo json_encode(['success' => true, 'feedback' => $feedback, 'score' => $score]);
            break;

        case 'next':
            $act->advance();
            $newItem = $act->getCurrentItem();
            echo json_encode(['success' => true, 'item' => $newItem]);
            break;

        case 'getAllItems':
            echo json_encode(['success' => true, 'items' => $act->getAllItems()]);
            break;

        default:
            http_response_code(400);
            echo json_encode(['error' => 'Ação desconhecida: ' . $action]);
    }
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}