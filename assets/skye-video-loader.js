/* Load the original Skye MP4 from same-origin static slices near viewport.
   The player receives a normal Blob-based MP4; no external media host is required. */
(() => {
  "use strict";
  for (const video of document.querySelectorAll("video[data-video-prefix][data-video-parts]")) {
    const status = video.closest("figure")?.querySelector(".skye-video-status");
    const count = Number(video.dataset.videoParts);
    const prefix = video.dataset.videoPrefix;
    if (!Number.isInteger(count) || count < 1 || count > 20 || !prefix?.startsWith("/assets/")) continue;
    let started = false;
    const loadVideo = async () => {
      if (started) return;
      started = true;
      if (status) status.textContent = "폭포 영상 불러오는 중…";
      try {
        const pieces = await Promise.all(
          Array.from({ length: count }, async (_, i) => {
            const name = prefix + ".part" + String(i + 1).padStart(2, "0") + ".bin";
            const response = await fetch(name, { credentials: "same-origin" });
            if (!response.ok) throw new Error("Media file unavailable: " + response.status);
            return response.arrayBuffer();
          })
        );
        const blob = new Blob(pieces, { type: "video/mp4" });
        if (blob.size < 100000) throw new Error("Media file incomplete");
        video.addEventListener("loadedmetadata", () => {
          if (status) status.hidden = true;
        }, { once: true });
        video.src = URL.createObjectURL(blob);
        video.load();
      } catch (error) {
        if (status) status.textContent = "영상을 불러오지 못했습니다. 잠시 후 페이지를 새로고침해 주세요.";
      }
    };
    if ("IntersectionObserver" in window) {
      const observer = new IntersectionObserver((entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.disconnect();
          void loadVideo();
        }
      }, { rootMargin: "900px 0px" });
      observer.observe(video);
    } else {
      void loadVideo();
    }
    video.addEventListener("pointerdown", () => { void loadVideo(); }, { once: true });
  }
})();
