function abrirLogin() {
            alert("Aquí se abrirá la ventana de autenticación de Supabase para iniciar sesión.");
            // Ejemplo de cambio visual al loguearse:
            // document.getElementById('auth-buttons').classList.add('hidden');
            // document.getElementById('user-profile').classList.remove('hidden');
        }

        function abrirRegistro() {
            alert("Aquí se abrirá el formulario de registro para nuevas alumnas.");
        }

        function reservarTurnoClase(clase) {
            alert(`¡Has seleccionado la clase de ${clase}! Asegurando tu lugar...`);
        }
        tailwind.config = {
            theme: {
                extend: {
                    colors: {
                        mf: {
                            pink: '#ec4899',
                            dark: '#0f0f0f',
                            card: '#18181b',
                            accent: '#f43f5e'
                        }
                    }
                }
            }
        }