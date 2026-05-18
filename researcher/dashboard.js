// ========== Variáveis globais ==========
let accuracyChart, timeChart, groupChart;
let currentData = { sessions: [], metrics: {} };

// ========== Funções auxiliares ==========
function showToast(message, isError = false) {
  const toastDiv = document.getElementById('toastMessage');
  const toast = document.createElement('div');
  toast.className = 'feedback-toast';
  toast.style.backgroundColor = isError ? '#ef4444' : '#22c55e';
  toast.textContent = message;
  toastDiv.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// ========== Carregar dados do backend ==========
async function loadDashboardData() {
  try {
    const resp = await fetch('../api.php?action=get_researcher_data');
    const data = await resp.json();
    if (data.success) {
      currentData = data;
      updateStats(data);
      updateCharts(data);
      updateLogTable(data.recent_logs || []);
      if (data.active_experiment) {
        document.getElementById('activeExp').innerText = data.active_experiment.name;
      } else {
        document.getElementById('activeExp').innerText = 'Nenhum';
      }
    } else {
      showToast('Erro ao carregar dados: ' + (data.error || 'desconhecido'), true);
    }
  } catch (err) {
    console.error(err);
    showToast('Erro de conexão com a API', true);
  }
}

function updateStats(data) {
  document.getElementById('totalSessions').innerText = data.total_sessions || 0;
  document.getElementById('avgAccuracy').innerText = (data.avg_accuracy || 0).toFixed(1) + '%';
  document.getElementById('avgTime').innerText = (data.avg_response_time || 0).toFixed(1);
}

function updateCharts(data) {
  const activities = data.by_activity || [];
  const labels = activities.map(a => a.activity);
  const accuracies = activities.map(a => a.accuracy);
  const times = activities.map(a => a.avg_time);

  // Gráfico de acertos
  if (accuracyChart) accuracyChart.destroy();
  const ctxAcc = document.getElementById('accuracyChart').getContext('2d');
  accuracyChart = new Chart(ctxAcc, {
    type: 'bar',
    data: { labels, datasets: [{ label: 'Acertos (%)', data: accuracies, backgroundColor: '#4f46e5' }] },
    options: { responsive: true, scales: { y: { max: 100, title: { display: true, text: '%' } } } }
  });

  // Gráfico de tempo
  if (timeChart) timeChart.destroy();
  const ctxTime = document.getElementById('timeChart').getContext('2d');
  timeChart = new Chart(ctxTime, {
    type: 'line',
    data: { labels, datasets: [{ label: 'Tempo médio (s)', data: times, borderColor: '#eab308', fill: false }] },
    options: { responsive: true }
  });

  // Comparação de grupos
  const groups = data.group_comparison || [];
  const groupLabels = groups.map(g => g.group);
  const groupScores = groups.map(g => g.avg_score);
  if (groupChart) groupChart.destroy();
  const ctxGroup = document.getElementById('groupCompareChart').getContext('2d');
  groupChart = new Chart(ctxGroup, {
    type: 'bar',
    data: { labels: groupLabels, datasets: [{ label: 'Pontuação média', data: groupScores, backgroundColor: '#10b981' }] },
    options: { responsive: true }
  });
}

function updateLogTable(logs) {
  const tbody = document.getElementById('logTableBody');
  tbody.innerHTML = '';
  logs.slice(0, 100).forEach(log => {
    const row = tbody.insertRow();
    row.insertCell(0).innerText = new Date(log.timestamp * 1000).toLocaleString();
    row.insertCell(1).innerText = log.session;
    row.insertCell(2).innerText = log.activity;
    row.insertCell(3).innerText = log.event;
    row.insertCell(4).innerText = JSON.stringify(log.data).substring(0, 80) + (JSON.stringify(log.data).length > 80 ? '…' : '');
  });
}

// ========== Exportação ==========
async function exportCSV() {
  try {
    const resp = await fetch('../api.php?action=export_logs&format=csv');
    const blob = await resp.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kantspeak_logs_${new Date().toISOString()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Logs exportados como CSV');
  } catch (err) {
    showToast('Erro ao exportar CSV', true);
  }
}

async function exportJSON() {
  try {
    const resp = await fetch('../api.php?action=export_logs&format=json');
    const blob = await resp.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kantspeak_logs_${new Date().toISOString()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Logs exportados como JSON');
  } catch (err) {
    showToast('Erro ao exportar JSON', true);
  }
}

// ========== Upload de experimento ==========
async function uploadExperiment(file) {
  const formData = new FormData();
  formData.append('experiment_config', file);
  try {
    const resp = await fetch('../api.php?action=upload_experiment', { method: 'POST', body: formData });
    const data = await resp.json();
    if (data.success) {
      showToast('Experimento ativado com sucesso!');
      loadDashboardData(); // recarrega dados
    } else {
      showToast('Erro: ' + (data.error || 'arquivo inválido'), true);
    }
  } catch (err) {
    showToast('Erro ao enviar arquivo', true);
  }
}

// ========== Eventos ==========
document.getElementById('refreshBtn').addEventListener('click', loadDashboardData);
document.getElementById('exportCSVBtn').addEventListener('click', exportCSV);
document.getElementById('exportJSONBtn').addEventListener('click', exportJSON);
document.getElementById('uploadExpBtn').addEventListener('click', () => {
  const fileInput = document.getElementById('expFile');
  if (fileInput.files.length > 0) {
    uploadExperiment(fileInput.files[0]);
  } else {
    showToast('Selecione um arquivo JSON primeiro', true);
  }
});
document.getElementById('logoutBtn').addEventListener('click', () => {
  window.location.href = '../home.html';
});

// ========== Inicialização ==========
loadDashboardData();