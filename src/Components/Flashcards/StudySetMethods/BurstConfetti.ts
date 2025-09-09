// Tiny confetti burst using DOM + CSS
export function burstConfetti(root) {

    const rect = root.getBoundingClientRect();

    // Spawn confetti from either left or right margin
    const spawnFromLeft = Math.random() < 0.5;
    const x = spawnFromLeft ? 0 : rect.width;

    // Random y position along the height
    const y = Math.random() * rect.height;

    const colors = ["#ff4757", "#ffa502", "#2ed573", "#1e90ff", "#e84393"];
    const pieces = 18;

    for (let i = 0; i < pieces; i++) {
        const el = document.createElement("span");
        el.className = "confetti-piece";

        const angle = Math.random() * Math.PI * 2;
        const velocity = 120 + Math.random() * 120; // px/s
        const duration = 600 + Math.random() * 300; // ms
        const dx = Math.cos(angle) * (velocity * (duration / 1000));
        const dy = Math.sin(angle) * (velocity * (duration / 1000));
        const size = 20 + Math.random() * 4;
        const rot = Math.floor(Math.random() * 360);

        // Set initial position and size
        el.style.position = 'absolute';
        el.style.left = `${x}px`;
        el.style.top = `${y}px`;
        el.style.width = `${size}px`;
        el.style.height = `${size * 0.6}px`;
        el.style.backgroundColor = colors[i % colors.length];
        el.style.pointerEvents = 'none';
        el.style.borderRadius = '1px';
        el.style.transform = 'translate(-50%, -50%)';

        // Set CSS custom properties for animation
        el.style.setProperty("--dx", `${dx}px`);
        el.style.setProperty("--dy", `${dy}px`);
        el.style.setProperty("--rz", `${rot}deg`);
        el.style.animationName = 'confetti-burst';
        el.style.animationDuration = `${duration}ms`;
        el.style.animationTimingFunction = 'cubic-bezier(0.17, 0.67, 0.4, 1)';
        el.style.animationFillMode = 'forwards';

        root.appendChild(el);

        // Clean up after animation
        const cleanup = () => {
            if (el.parentNode) {
                el.parentNode.removeChild(el);
            }
        };

        el.addEventListener("animationend", cleanup, { once: true });

        // Fallback cleanup in case animationend doesn't fire
        setTimeout(cleanup, duration + 100);
    }
};