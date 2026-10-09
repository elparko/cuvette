import os

app = defines["app"]  # noqa: F821
name = os.path.basename(app)

format = "ULMO"
filesystem = "APFS"
files = [app]
symlinks = {"Applications": "/Applications"}
icon_locations = {name: (150, 170), "Applications": (450, 170)}
window_rect = ((200, 200), (600, 360))
icon_size = 112
text_size = 13
show_status_bar = False
show_tab_view = False
show_toolbar = False
show_pathbar = False
show_sidebar = False
default_view = "icon-view"
background = "#f4f4f2"
