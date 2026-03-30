export const exportData = async () => {
  const electronAPI = (window as any).electronAPI;
  if (!electronAPI) return;

  const data = await electronAPI.readStore();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `timemaster-backup-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

export const importData = (file: File): Promise<void> => {
  const electronAPI = (window as any).electronAPI;
  if (!electronAPI) return Promise.reject('Electron API not found');

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (typeof data !== 'object') throw new Error('Invalid data format');
        
        if (confirm('기존 데이터가 덮어씌워집니다. 계속하시겠습니까?')) {
          // 모든 키를 하나씩 저장 (electronAPI에 clear가 없으므로 덮어쓰기 방식으로 작동)
          for (const key of Object.keys(data)) {
            electronAPI.writeStore(key, data[key]);
          }
          window.location.reload();
          resolve();
        }
      } catch (err) {
        alert('데이터를 불러오는 중 오류가 발생했습니다.');
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
};
