from rdkit import Chem, rdBase
from rdkit.Chem import Crippen, Lipinski, rdMolDescriptors

# IUPAC 2005 standard atomic weights, the table that Open Babel uses
C, H, O = 12.0107, 1.00794, 15.9994
mol = Chem.MolFromSmiles("CC(=O)Oc1ccccc1C(=O)O")
print("rdkit", rdBase.rdkitVersion)
print("formula", rdMolDescriptors.CalcMolFormula(mol))
print("MW by hand, C9H8O4 %.3f" % (9 * C + 8 * H + 4 * O))
print("logP, RDKit Crippen %.4f" % Crippen.MolLogP(mol))
print("TPSA, RDKit Ertl %.1f" % rdMolDescriptors.CalcTPSA(mol))
print("HBD, RDKit Lipinski NHOH count %d" % Lipinski.NHOHCount(mol))
print("InChIKey, RDKit", Chem.MolToInchiKey(mol))
print("acetate largest fragment, RDKit canonical", Chem.MolToSmiles(Chem.MolFromSmiles("CC(=O)[O-]")))
