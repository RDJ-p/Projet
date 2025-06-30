document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('resetForm');
  const resetMessage = document.getElementById('reset-message');
  const token = window.location.pathname.split('/').pop();

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    const newPassword = document.getElementById('newPassword').value;

    resetMessage.textContent = 'Processing...';
    resetMessage.style.color = '#444';

    try {
      const response = await fetch(`/auth/reset-password/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword })
      });

      const data = await response.json();

      if (data.success) {
        resetMessage.textContent = '✅ Password reset successful! Redirecting...';
        resetMessage.style.color = 'green';
        setTimeout(() => window.location.href = '/Login page.html', 2000);
      } else {
        resetMessage.textContent = '❌ ' + (data.error || 'Error resetting password.');
        resetMessage.style.color = 'red';
      }

    } catch (err) {
      console.error('❌ Network/server error:', err);
      resetMessage.textContent = '❌ Server error. Please try again later.';
      resetMessage.style.color = 'red';
    }
  });
});
