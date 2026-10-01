// Hardware of the Linux VM for scenario exercises. tooling/vm/build.ts boots with these values and saves the
// snapshot; the browser restores it with the same values, because v86 can only restore onto identical hardware.
// There is deliberately no network: no relay, so the emulated network card has nothing to talk to, and the image
// ships without network drivers (see tooling/vm/Dockerfile).

/** Folder under /vm/ (served) and vendor/vm/ (committed). Bump it when the image changes incompatibly. */
export const VM_IMAGE = 'debian-12';
export const VM_MEMORY = 256 * 1024 * 1024;
export const VM_VGA_MEMORY = 2 * 1024 * 1024;
export const VM_CMDLINE = 'rw init=/bin/systemd root=host9p console=ttyS0 mitigations=off init_on_free=on systemd.show_status=false';

/**
 * The v86 options both sides share; paths are filled in by the caller (file paths in Node, URLs in the browser).
 * `fsJson` is only needed to boot: a restored snapshot brings its own file table and fetches file contents from `files`.
 */
export function vmOptions(paths: { wasm: string; bios: string; vgaBios: string; files: string; fsJson?: string }) {
  return {
    wasm_path: paths.wasm,
    bios: { url: paths.bios },
    vga_bios: { url: paths.vgaBios },
    memory_size: VM_MEMORY,
    vga_memory_size: VM_VGA_MEMORY,
    cmdline: VM_CMDLINE,
    filesystem: { basefs: paths.fsJson, baseurl: paths.files },
    // ttyS0: the learner's terminal, ttyS1: lp-agent (setup, clock, terminal size, checks).
    uart1: true,
    disable_keyboard: true,
    disable_mouse: true,
    disable_speaker: true,
  };
}
