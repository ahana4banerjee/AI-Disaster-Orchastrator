def allocate_resources(severity, population_density):
    base = int(population_density / 1000)

    if severity == "Low":
        return {
            "ambulances": base,
            "rescue_teams": max(1, base // 2),
            "relief_camps": 1
        }

    elif severity == "Medium":
        return {
            "ambulances": base * 2,
            "rescue_teams": base,
            "relief_camps": 3
        }

    else:  # High
        return {
            "ambulances": base * 3,
            "rescue_teams": base * 2,
            "relief_camps": 5
        }