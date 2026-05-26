<?php
require_once 'core/AdaptiveEngine.php';
require_once 'core/Logger.php';
require_once 'core/SessionManager.php';
require_once 'core/Atividade.php';
require_once 'activities/Alphabet.php'; 

session_start();

$logger = new Logger(session_id());
$engine = new AdaptiveEngine($logger, ['alphabet', 'listen', 'speak', 'write', 'sorting','time_trial']);
// Recupera histórico da sessão
$history = $_SESSION['activity_history'] ?? [];
$next = $engine->selectNextActivity($history);
echo json_encode(['next_activity' => $next]);

$session = new SessionManager();
$sessionId = session_id();

// Carregar contexto do usuário
$contextFile = __DIR__ . "/data/context/{$sessionId}.json";
$context = file_exists($contextFile) ? json_decode(file_get_contents($contextFile), true) : [];

// Se não houver contexto, inicializar com valores padrão
if (empty($context)) {
    $context = [
        'session' => $sessionId,
        'age' => $_SESSION['age'] ?? 7,   // se tiver formulário de cadastro
        'support_level' => $_SESSION['support_level'] ?? 1,
        'activities' => [],
        'last_update' => time()
    ];
}

// Lista de atividades disponíveis
$activityList = ['alphabet', 'listen', 'speak', 'write', 'sorting'];

// Parâmetros da distribuição Beta para cada atividade
$scores = [];
foreach ($activityList as $act) {
    $history = $context['activities'][$act] ?? ['success' => 0, 'failure' => 0];
    // Adiciona os hiperparâmetros (prior) – quanto maior, mais a média inicial puxa para 0.5
    $alpha = $history['success'] + 1;
    $beta  = $history['failure'] + 1;
    
    // Ajuste contextual (exemplo: se a criança é mais velha, favorecer atividades mais complexas)
    if ($act === 'write' && $context['age'] >= 10) {
        $alpha += 2; // aumenta a média simulada
    }
    if ($act === 'alphabet' && $context['age'] <= 6) {
        $beta -= 0.5; // reduz a penalidade (torna mais fácil)
    }
    
    // Geração de amostra da distribuição Beta (usando aproximação Gamma ou função built-in)
    // Como PHP não tem função direta, usaremos uma aproximação:
    $theta = beta_sample($alpha, $beta);
    $scores[$act] = $theta;
}

// Seleciona a atividade com maior amostra
arsort($scores);
$nextActivity = key($scores);

// Salva o contexto atualizado (apenas a parte de histórico será atualizada quando chegar o evento "check")
file_put_contents($contextFile, json_encode($context, JSON_PRETTY_PRINT));

header('Content-Type: application/json');
echo json_encode(['next_activity' => $nextActivity]);

// Função auxiliar para amostrar da Beta (usando método de rejeição, simples)
function beta_sample($alpha, $beta) {
    // Se $alpha e $beta são inteiros pequenos, podemos usar o método de 
    // distribuição Gamma via relação com distribuição de Poisson.
    // Uma implementação simples (não eficiente mas funcional):
    $x = 0;
    $y = 0;
    do {
        $x = pow(rand() / getrandmax(), 1/$alpha);
        $y = pow(rand() / getrandmax(), 1/$beta);
    } while ($x + $y > 1);
    return $x / ($x + $y);
}
?>