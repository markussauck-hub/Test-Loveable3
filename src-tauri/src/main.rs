// Im Release kein Konsolenfenster unter Windows öffnen.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    schalttafel_lib::run()
}
