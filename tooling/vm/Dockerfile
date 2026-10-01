# Debian 12 (i386) für die Szenario-Übungen. v86 emuliert nur 32-bit x86; Debian 12 ist die letzte Version mit
# i386-Kernel (LTS bis Juni 2028). Gebaut von `pnpm vm:build`, das Ergebnis läuft ohne Netzwerk im Browser.
# Angelehnt an tools/docker/debian aus https://github.com/copy/v86 (BSD-2-Clause).
#
# Zwei Ergebnisse: das Wurzeldateisystem (letzte Stufe, kommt per 9p aus dem Emulator) und die Bootplatte (Stufe
# `disk`): eine 64-MB-Platte mit GRUB im MBR und /boot auf der ersten Partition. So bootet die VM wie ein Server,
# auch nach `reboot`, und GRUB, Kernelzeile und initramfs lassen sich wirklich ändern.
FROM i386/debian:bookworm-slim AS system

ENV DEBIAN_FRONTEND=noninteractive

# Kernel, systemd (mit dbus, sonst scheitert `systemctl status` ohne sudo), GRUB und die Werkzeuge, die die Szenarien
# brauchen. curl, dig, ssh und tcpdump nur für localhost: Die VM hat keinen Netzwerkzugang.
# Das Slim-Image lässt Handbuchseiten weg (/etc/dpkg/dpkg.cfg.d/docker). Der Kurs übt `man` und `apropos`, deshalb
# kommen sie hier dazu, auch für die schon installierten Grundpakete (--reinstall).
RUN sed -i '\|^path-exclude /usr/share/man/|d' /etc/dpkg/dpkg.cfg.d/docker \
    && apt-get update \
    && apt-get install -y --no-install-recommends --reinstall $(dpkg-query -W -f '${binary:Package} ') \
    && apt-get install -y --no-install-recommends \
      linux-image-686 systemd-sysv dbus initramfs-tools grub-pc-bin grub2-common \
      bash-completion busybox ca-certificates curl file iproute2 less lsof nano procps psmisc strace sudo tzdata vim-tiny \
      acl bind9-dnsutils cron cryptsetup-bin desktop-file-utils dnsmasq-base fdisk htop iputils-ping lvm2 man-db \
      manpages netcat-openbsd nginx openssh-client openssh-server pciutils pkexec polkitd rsync sysstat tcpdump tree \
      xz-utils zstd \
    && rm -rf /var/lib/apt/lists/* /var/cache/apt/*.bin \
    && rm -f /etc/apt/apt.conf.d/docker-clean
# docker-clean (aus dem Slim-Image) löscht jede heruntergeladene .deb gleich wieder; auf einem Server bleibt der Cache.

# Root-Dateisystem kommt per 9p aus dem Emulator (siehe rootfs/etc/initramfs-tools/scripts/boot-9p). Nur die
# Module dafür kommen ins initramfs, so bleibt es klein.
COPY rootfs/etc/initramfs-tools/scripts/boot-9p /etc/initramfs-tools/scripts/boot-9p
RUN printf '%s\n' 9p 9pnet 9pnet_virtio virtio virtio_ring virtio_pci >> /etc/initramfs-tools/modules \
    && sed -i 's/^MODULES=.*/MODULES=list/' /etc/initramfs-tools/initramfs.conf \
    && echo 'BOOT=boot-9p' >> /etc/initramfs-tools/initramfs.conf \
    && update-initramfs -u

# Kernelmodule: nur Dateisysteme, Blockgeräte (IDE-Platte, Loop, Device Mapper), virtio und was diese brauchen.
# Ohne drivers/net gibt es in der VM keine Netzwerkkarte, nur loopback. Ohne CD-Laufwerk kein sr_mod.
RUN cd /lib/modules/*/kernel \
    && for d in *; do case $d in arch|block|crypto|drivers|fs|lib|net) ;; *) rm -rf "$d" ;; esac; done \
    && for d in drivers/*; do case $d in drivers/ata|drivers/block|drivers/md|drivers/scsi|drivers/virtio) ;; *) rm -rf "$d" ;; esac; done \
    && for d in net/*; do case $d in net/9p) ;; *) rm -rf "$d" ;; esac; done \
    && rm -f drivers/scsi/sr_mod.ko \
    && depmod -a "$(basename "$(dirname "$PWD")")"

# Zeitzone und Sprache wie beim Lernenden.
RUN ln -sf /usr/share/zoneinfo/Europe/Berlin /etc/localtime && echo Europe/Berlin > /etc/timezone

# Der Lernende arbeitet als `ops` mit sudo, wie auf einem Server. adm und systemd-journal: journalctl ohne sudo.
# root hat kein Passwort: Im Emergency-Modus genügt Enter an der Wartungsabfrage.
RUN useradd -m -s /bin/bash -G sudo,adm,systemd-journal ops \
    && passwd -d ops && passwd -d root \
    && echo 'ops ALL=(ALL) NOPASSWD: ALL' > /etc/sudoers.d/ops && chmod 440 /etc/sudoers.d/ops \
    && touch /home/ops/.hushlogin && chown ops:ops /home/ops/.hushlogin \
    && : > /etc/motd

# Dienste, die ohne Netzwerk nur Zeit kosten, und Dienste, die erst ein Szenario startet.
RUN systemctl disable apt-daily.timer apt-daily-upgrade.timer e2scrub_all.timer fstrim.timer man-db.timer nginx.service 2>/dev/null; \
    systemctl mask systemd-timesyncd.service getty@tty1.service 2>/dev/null; true

# grub-mkconfig fragt grub-probe nach dem Gerät von /, um root= zu setzen. Das 9p-Dateisystem liegt auf keinem
# Blockgerät; der Wrapper unter /usr/sbin/grub-probe beantwortet diese eine Frage, alles andere das echte Programm.
RUN dpkg-divert --local --rename --divert /usr/sbin/grub-probe.real --add /usr/sbin/grub-probe

# Steuerkanal (ttyS1), Autologin auf ttyS0, Hostname, fstab, GRUB-Einstellungen. COPY schreibt in die Image-Ebene;
# Docker überdeckt /etc/hosts und /etc/hostname nur während RUN.
COPY rootfs/ /
RUN chmod 755 /usr/local/sbin/lp-agent /usr/sbin/grub-probe && systemctl enable lp-agent.service

# Die Bootplatte: MBR mit GRUB, Partition 1 (ext4, Label boot) mit Kernel, initramfs und GRUB-Modulen. Die erste
# grub.cfg ist von Hand geschrieben; `pnpm vm:build` ersetzt sie in der VM durch die von update-grub.
FROM system AS disk
COPY disk/grub.cfg /tmp/grub.cfg
RUN set -e; \
    kernel=$(basename /boot/vmlinuz-* | sed 's/^vmlinuz-//'); \
    mkdir -p /tmp/boot/grub/i386-pc /out; \
    cp -a /boot/. /tmp/boot/; \
    cp /usr/lib/grub/i386-pc/*.mod /usr/lib/grub/i386-pc/*.lst /tmp/boot/grub/i386-pc/; \
    sed "s/@KERNEL@/$kernel/g" /tmp/grub.cfg > /tmp/boot/grub/grub.cfg; \
    grub-editenv /tmp/boot/grub/grubenv create; \
    mke2fs -q -t ext4 -L boot -U 6c7e4a52-1f0b-4d3e-9a52-0b0071e00b00 -E root_owner=0:0 -d /tmp/boot /tmp/part.img 63M; \
    truncate -s 64M /out/disk.img; \
    echo 'start=2048, type=83, bootable' | sfdisk -q /out/disk.img; \
    dd if=/tmp/part.img of=/out/disk.img bs=512 seek=2048 conv=notrunc status=none; \
    # core.img (diskboot + GRUB-Kern mit Platten-, Partitions- und ext4-Treiber) liegt ab Sektor 1 in der Lücke vor
    # der Partition; grub-mkimage trägt seine Länge ein, Startsektor 2 ist der Standard. Der MBR-Code (boot.img,
    # 440 Byte, lädt Sektor 1) lässt die Partitionstabelle stehen.
    grub-mkimage -O i386-pc -o /tmp/core.img -p '(hd0,msdos1)/grub' biosdisk part_msdos ext2; \
    dd if=/tmp/core.img of=/out/disk.img bs=512 seek=1 conv=notrunc status=none; \
    dd if=/usr/lib/grub/i386-pc/boot.img of=/out/disk.img bs=440 count=1 conv=notrunc status=none

FROM scratch AS disk-image
COPY --from=disk /out/disk.img /

# Das Wurzeldateisystem: /boot ist nur der Einhängepunkt für die Bootplatte.
FROM system
RUN rm -rf /boot/* && mkdir -p /boot
