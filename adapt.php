<?php
/**
 * adapt.php – Endpoint para seleção adaptativa da próxima atividade
 * 
 * Implementa Thompson Sampling contextual: cada atividade é um "braço"
 * modelado por uma distribuição Beta(α, β), onde α = sucessos + 1, β = falhas + 1.
 * A cada chamada, amostramos um valor de cada distribuição e escolhemos a atividade
 * com maior amostra. Contexto (idade, nível de suporte) influencia os priors.
 */

session_start();
require_once 'core/Logger.php';
require_once 'core/SessionManager.php';

$session = new SessionManager();
$sessionId = session_id();

// Diretório onde ficam os arquivos de contexto (histórico de acertos/erros por atividade)
$contextDir = __DIR__ . '/data/context/';
if (!is_dir($contextDir)) mkdir($contextDir, 0777, true);
$contextFile = $contextDir . $sessionId . '.json';

// Carrega contexto ou inicializa com valores padrão
$context = file_exists($contextFile) ? json_decode(file_get_contents($contextFile), true) : [];
if (empty($context)) {
    // Tenta obter idade e nível de suporte da sessão (podem vir de um cadastro inicial)
    $context = [
        'session' => $sessionId,
        'age' => $_SESSION['age'] ?? 7,
        'support_level' => $_SESSION['support_level'] ?? 1,
        'activities' => [],
        'last_update' => time()
    ];
}

// Lista de todas as atividades disponíveis no sistema
$activityList = ['alphabet', 'listen', 'speak', 'write', 'sorting'];

// Calcula pontuação (amostra) para cada atividade usando Thompson Sampling
$scores = [];
foreach ($activityList as $act) {
    $hist = $context['activities'][$act] ?? ['success' => 0, 'failure' => 0];
    // Priors: +1 para sucessos e falhas (distribuição uniforme a priori)
    $alpha = $hist['success'] + 1;
    $beta  = $hist['failure'] + 1;
    
    // Ajustes contextuais simples (exemplo: idade influencia a dificuldade preferida)
    if ($act === 'write' && $context['age'] >= 10) {
        $alpha += 2;          // criança mais velha tem "prior" melhor para escrita
    }
    if ($act === 'alphabet' && $context['age'] <= 6) {
        $beta -= 0.5;         // criança mais nova tem falhas menos penalizadas no alfabeto
        // Garantir que beta não fique <= 0
        if ($beta < 0.1) $beta = 0.1;
    }
    
    // Amostra da distribuição Beta(α, β)
    $theta = beta_sample($alpha, $beta);
    $scores[$act] = $theta;
}

// Escolhe a atividade com maior amostra
arsort($scores);
$nextActivity = key($scores);

// (Opcional) Registra a decisão no log de eventos do usuário
$logger = new Logger($sessionId);
$logger->logEvent('adaptive', 'decision', [
    'scores' => $scores,
    'selected' => $nextActivity,
    'context' => ['age' => $context['age'], 'support_level' => $context['support_level']]
]);

// Atualiza apenas o timestamp (o histórico será modificado pelo api.php quando houver um "check")
$context['last_update'] = time();
file_put_contents($contextFile, json_encode($context, JSON_PRETTY_PRINT));

header('Content-Type: application/json');
echo json_encode(['next_activity' => $nextActivity]);

/**
 * Gera uma amostra da distribuição Beta(α, β) usando o método de Johnk (válido para α, β > 0).
 * Este método é robusto mesmo para valores não inteiros.
 */
function beta_sample($alpha, $beta) {
    // Método de Johnk:
    // Seja X = pow(U1, 1/α) e Y = pow(U2, 1/β), com U1, U2 uniformes(0,1).
    // Aceita se X + Y <= 1; então retorna X / (X + Y).
    do {
        $u1 = mt_rand() / mt_getrandmax();
        $u2 = mt_rand() / mt_getrandmax();
        $x = pow($u1, 1.0 / $alpha);
        $y = pow($u2, 1.0 / $beta);
    } while ($x + $y > 1.0);
    return $x / ($x + $y);
}
?>