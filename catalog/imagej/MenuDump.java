import java.awt.*;
public class MenuDump {
  static void walk(MenuItem mi, String prefix) {
    String l = mi.getLabel();
    if (mi instanceof Menu) {
      Menu m = (Menu) mi;
      for (int i = 0; i < m.getItemCount(); i++) walk(m.getItem(i), prefix.isEmpty() ? l : prefix + " > " + l);
    } else if (!l.equals("-")) System.out.println(prefix + " > " + l);
  }
  public static void main(String[] a) {
    new ij.ImageJ(ij.ImageJ.NO_SHOW);
    MenuBar mb = ij.Menus.getMenuBar();
    for (int i = 0; i < mb.getMenuCount(); i++) walk(mb.getMenu(i), "");
    System.exit(0);
  }
}
