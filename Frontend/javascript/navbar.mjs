export function initMobileNav() {
    const mobileNavButton = document.getElementById('mobile-nav-button');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');

    if (mobileNavButton && sidebar) {
        mobileNavButton.addEventListener('click', () => {
            const isOpen = !sidebar.classList.contains('-translate-x-full');
            if (isOpen) {
                // Close sidebar
                sidebar.classList.add('-translate-x-full');
                overlay?.classList.add('hidden');
            } else {
                // Open sidebar
                sidebar.classList.remove('-translate-x-full');
                overlay?.classList.remove('hidden');
            }
        });

        // Close sidebar when clicking outside
        document.addEventListener('click', (e) => {
            if (!sidebar.contains(e.target) && 
                !mobileNavButton.contains(e.target) && 
                !sidebar.classList.contains('-translate-x-full')) {
                sidebar.classList.add('-translate-x-full');
                overlay?.classList.add('hidden');
            }
        });
    }
}