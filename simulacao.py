import numpy as np
import matplotlib.pyplot as plt
from scipy.stats import beta

# Inicialização
activities = ['Alphabet', 'Listen', 'Speak', 'Write', 'Sorting']
successes = {a: 0 for a in activities}
failures = {a: 0 for a in activities}
history = []  # armazena a atividade escolhida a cada passo

def beta_sample(alpha, beta_):
    return np.random.beta(alpha, beta_)

# Simular 100 interações (a cada passo, algoritmo escolhe a atividade com maior amostra)
for step in range(100):
    samples = {}
    for a in activities:
        alpha = successes[a] + 1
        beta_ = failures[a] + 1
        samples[a] = beta_sample(alpha, beta_)
    chosen = max(samples, key=samples.get)
    history.append(chosen)
    # Simula resultado (acerto com probabilidade dependente da atividade – aqui fixo para demonstração)
    # Para simular um comportamento realista, vamos supor que cada atividade tem uma taxa de acerto "verdadeira":
    true_accuracy = {'Alphabet': 0.8, 'Listen': 0.6, 'Speak': 0.4, 'Write': 0.5, 'Sorting': 0.7}
    if np.random.rand() < true_accuracy[chosen]:
        successes[chosen] += 1
    else:
        failures[chosen] += 1

# Gráfico 1: Evolução das escolhas
plt.figure(figsize=(12, 4))
plt.plot(range(1, 101), history, 'o-', markersize=2, alpha=0.7)
plt.yticks(range(len(activities)), activities)
plt.xlabel('Interação')
plt.ylabel('Atividade escolhida')
plt.title('Evolução das escolhas do Thompson Sampling')
plt.grid(True, linestyle='--', alpha=0.5)
plt.tight_layout()
plt.savefig('thompson_choices.png', dpi=150)
plt.show()

# Gráfico 2: Distribuições Beta finais
plt.figure(figsize=(10, 6))
x = np.linspace(0, 1, 200)
for a in activities:
    alpha = successes[a] + 1
    beta_ = failures[a] + 1
    y = beta.pdf(x, alpha, beta_)
    plt.plot(x, y, label=f'{a} (α={alpha}, β={beta_})', linewidth=2)
plt.xlabel('Probabilidade de sucesso (θ)')
plt.ylabel('Densidade')
plt.title('Distribuições Beta após 100 interações')
plt.legend()
plt.grid(True, linestyle='--', alpha=0.5)
plt.savefig('beta_distributions.png', dpi=150)
plt.show()

print("Contadores finais:")
for a in activities:
    print(f"{a}: acertos={successes[a]}, erros={failures[a]}")