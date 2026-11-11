"""Check the Scenario 4 claim from original-notes.docx using the notes' own parameters.

Run: python3 tools/check_scenario4.py
Euler integration of the replicator dynamics, no extra libraries needed.
"""

B, c0, alpha, G, F, p0, k, G_sim, c_risco = 2.0, 0.5, 1.5, 1.8, 4.0, 0.2, 1.2, 1.9, 0.8


def run(crowding: bool, steps: int = 3000, dt: float = 0.01):
    xr, xf = 0.05, 0.05
    for _ in range(steps):
        xc = 1 - xr - xf
        uc = B - c0 - alpha * xr
        ur = B + G - (p0 + k * xr) * F
        uf = B + G_sim * ((1 - xf) if crowding else 1) - c_risco
        u = xc * uc + xr * ur + xf * uf
        xr += dt * xr * (ur - u)
        xf += dt * xf * (uf - u)
    return round(1 - xr - xf, 3), round(xr, 3), round(xf, 3)


if __name__ == "__main__":
    print("notes model   (C, R, F):", run(crowding=False))
    print("with crowding (C, R, F):", run(crowding=True))
