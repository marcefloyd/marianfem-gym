import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const SUPABASE_URL = 'https://ciorlilsipudyqhuzxzh.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_VFhlc6La51QGJT-_qVu19Q_6hqlXWof'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

const form = document.getElementById('login-form')
const errorMsg = document.getElementById('error-msg')

form.addEventListener('submit', async (e) => {
    e.preventDefault()
    const email = document.getElementById('email').value.trim()
    const password = document.getElementById('password').value.trim()

    errorMsg.classList.add('hidden')

    // Llamada oficial de Supabase para iniciar sesión
    const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
    })

    if (error) {
        errorMsg.textContent = "Error de acceso: " + error.message;
        errorMsg.classList.remove('hidden');
    } else {
        // Redirección inteligente según quién inicie sesión
        const correoAdmin = "admin@marianfem.com"; // El correo de la dueña

        if (email.toLowerCase() === correoAdmin.toLowerCase()) {
            // Si es la dueña, va al panel de administración del gimnasio
            window.location.href = 'admin-gimnasio.html';
        } else {
            // Si es cualquier clienta registrada, va a su panel de usuaria
            window.location.href = 'cliente-dashboard.html';
        }
    }
})