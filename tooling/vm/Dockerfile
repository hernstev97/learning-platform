# Debian 12 (i386) für die Szenario-Übungen. v86 emuliert nur 32-bit x86; Debian 12 ist die letzte Version mit
# i386-Kernel (LTS bis Juni 2028). Gebaut von `pnpm vm:build`, das Ergebnis läuft ohne Netzwerk im Browser.
# Angelehnt an tools/docker/debian aus https://github.com/copy/v86 (BSD-2-Clause).
FROM i386/debian:bookworm-slim

ENV DEBIAN_FRONTEND=noninteractive

# Kernel, systemd (mit dbus, sonst scheitert `systemctl status` ohne sudo) und die Werkzeuge, die die Szenarien
# brauchen. curl nur für localhost: Die VM hat keinen Netzwerkzugang.
RUN apt-get update && apt-get install -y --no-install-recommends \
      linux-image-686 systemd-sysv dbus initramfs-tools \
      bash-completion busybox ca-certificates curl file iproute2 less lsof nano procps psmisc strace sudo tzdata vim-tiny \
    && rm -rf /var/lib/apt/lists/* /var/cache/apt/*.bin

# Root-Dateisystem kommt per 9p aus dem Emulator (siehe rootfs/etc/initramfs-tools/scripts/boot-9p). Nur die
# Module dafür kommen ins initramfs, so bleibt es klein.
COPY rootfs/etc/initramfs-tools/scripts/boot-9p /etc/initramfs-tools/scripts/boot-9p
RUN printf '%s\n' 9p 9pnet 9pnet_virtio virtio virtio_ring virtio_pci >> /etc/initramfs-tools/modules \
    && sed -i 's/^MODULES=.*/MODULES=list/' /etc/initramfs-tools/initramfs.conf \
    && echo 'BOOT=boot-9p' >> /etc/initramfs-tools/initramfs.conf \
    && update-initramfs -u

# Kernelmodule: nur Dateisysteme, Blockgeräte, virtio und was diese brauchen. Ohne drivers/net gibt es in der VM
# keine Netzwerkkarte, nur loopback.
RUN cd /lib/modules/*/kernel \
    && for d in *; do case $d in arch|block|crypto|drivers|fs|lib|net) ;; *) rm -rf "$d" ;; esac; done \
    && for d in drivers/*; do case $d in drivers/block|drivers/md|drivers/virtio) ;; *) rm -rf "$d" ;; esac; done \
    && for d in net/*; do case $d in net/9p) ;; *) rm -rf "$d" ;; esac; done \
    && depmod -a "$(basename "$(dirname "$PWD")")"

# Zeitzone und Sprache wie beim Lernenden.
RUN ln -sf /usr/share/zoneinfo/Europe/Berlin /etc/localtime && echo Europe/Berlin > /etc/timezone

# Der Lernende arbeitet als `ops` mit sudo, wie auf einem Server. adm und systemd-journal: journalctl ohne sudo.
RUN useradd -m -s /bin/bash -G sudo,adm,systemd-journal ops \
    && passwd -d ops && passwd -d root \
    && echo 'ops ALL=(ALL) NOPASSWD: ALL' > /etc/sudoers.d/ops && chmod 440 /etc/sudoers.d/ops \
    && touch /home/ops/.hushlogin && chown ops:ops /home/ops/.hushlogin \
    && : > /etc/motd

# Dienste, die ohne Netzwerk nur Zeit kosten.
RUN systemctl disable apt-daily.timer apt-daily-upgrade.timer e2scrub_all.timer fstrim.timer 2>/dev/null; \
    systemctl mask systemd-timesyncd.service getty@tty1.service 2>/dev/null; true

# Steuerkanal (ttyS1), Autologin auf ttyS0, Hostname. COPY schreibt in die Image-Ebene; Docker überdeckt
# /etc/hosts und /etc/hostname nur während RUN.
COPY rootfs/ /
RUN chmod 755 /usr/local/sbin/lp-agent && systemctl enable lp-agent.service
