<?php
require_once __DIR__ . '/../core/Atividade.php';
class TimeTrial extends Atividade {
    private array $vocabulary;

    public function __construct(array $itens, SessionManager $session) {
        parent::__construct('Time Trial', $itens, 'timetrial_index', $session);
        $this->vocabulary = $itens;
    }

    public function process(array $post): void {
        $resposta = strtoupper(trim($post['resposta'] ?? ''));
        $correta = strtoupper($this->getCurrentItem()['word']);
        $group = $post['group'] ?? 'control';
        $timeLimit = (float)($post['time_limit'] ?? 5);

        if ($resposta === $correta) {
            $this->addPoints(10);
            $this->advance();
            $this->session->setFeedback('Correct! +10 points');
        } else {
            $this->session->setFeedback('Wrong! Try again.');
        }

        // Opcional: registrar dados do experimento na sessão para análise posterior
        $_SESSION['last_trial'] = [
            'word' => $correta,
            'user_answer' => $resposta,
            'correct' => ($resposta === $correta),
            'time_limit' => $timeLimit,
            'group' => $group
        ];
    }
}