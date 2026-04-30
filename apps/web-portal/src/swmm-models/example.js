const swmmModelInput = {
  // Outlets
  outlets: [
    {
      name: "5",
      inletNode: "4",
      outletNode: "5",
      description: "",
      tag: "",
      inletOffset: 0,
      flapGate: "NO",
      ratingCurve: "FUNCTIONAL/DEPTH",
      functionalCurve: {
        coefficient: 10.0,
        exponent: 0.5,
      },
      tabularCurve: "",
      curveName: "*",
    },
  ],

  // LID Controls
  lidControls: [
    {
      controlName: "",
      lidType: "Rain Garden",
      surface: {
        thickness: 0, // in or mm
      },
      soil: {
        porosity: 0.5, // volume fraction
        fieldCapacity: 0.2, // volume fraction
        wiltingPoint: 0.1, // volume fraction
        conductivity: 0.5, // in/hr or mm/hr
        conductivitySlope: 10.0,
        suctionHead: 3.5, // in or mm
      },
      storage: {
        thickness: 0, // in or mm
        voidRatio: 0.75, // Voids / Solids
        seepageRate: 0.5, // in/hr or mm/hr
        cloggingFactor: 0,
      },
      vegetation: {
        bermHeight: 0.0, // in or mm
        vegetationVolumeFraction: 0.0,
        surfaceRoughness: 0.1, // Mannings n
        surfaceSlope: 1.0, // percent
      },
    },
  ],

  // Rain Gages
  rainGages: [
    {
      name: "1",
      xCoordinate: -2536.116,
      yCoordinate: 8956.661,
      description: "",
      tag: "",
      rainFormat: "INTENSITY",
      timeInterval: "1:00",
      snowCatchFactor: 1.0,
      dataSource: "TIMESERIES",
      timeSeries: {
        seriesName: "",
      },
      dataFile: {
        fileName: "",
        stationID: "*",
        rainUnits: "MM",
      },
    },
  ],

  // Subcatchments
  subcatchments: [
    {
      name: "",
      description: "",
      tag: "",
      rainGage: "*",
      outlet: "*",
      area: 5,
      width: 500,
      percentSlope: 0.5,
      percentImperv: 25,
      nImperv: 0.01,
      nPerv: 0.1,
      dstoreImperv: 0.05,
      dstorePerv: 0.05,
      percentZeroImperv: 25,
      subareaRouting: "OUTLET",
      percentRouted: 100,
      infiltrationData: "CURVE_NUMBER",
      groundwater: "NO",
      snowPack: "",
      lidControls: 0,
      landUses: 0,
      initialBuildup: "NONE",
      curbLength: 0,
      nPervPattern: "",
      dstorePattern: "",
      infilPattern: "",
    },
  ],

  // Inlets
  inlets: [
    {
      inletName: "",
      inletType: "CURB OPENING",
      curbOpeningInlet: {
        length: 2, // ft
        height: 0.5, // ft
        throatAngle: "VERTICAL",
      },
    },
  ],

  // Conduits
  conduits: [
    {
      name: "1",
      inletNode: "3",
      outletNode: "4",
      description: "",
      tag: "",
      shape: "CIRCULAR",
      maxDepth: 1,
      length: 400,
      roughness: 0.01,
      inletOffset: 0,
      outletOffset: 0,
      initialFlow: 0,
      maximumFlow: 0,
      entryLossCoeff: 0,
      exitLossCoeff: 0,
      avgLossCoeff: 0,
      seepageLossRate: 0,
      flapGate: "NO",
      culvertCode: "",
      inlets: "NO",
    },
  ],

  // Aquifers
  aquifers: [
    {
      aquiferName: "",
      porosity: 0.5,
      wiltingPoint: 0.15,
      fieldCapacity: 0.3,
      conductivity: 5.0,
      conductivitySlope: 10.0,
      tensionSlope: 15.0,
      upperEvapFraction: 0.35,
      lowerEvapDepth: 14.0,
      lowerGWLossRate: 0.002,
      bottomElevation: 0.0,
      waterTableElevation: 10.0,
      unsatZoneMoisture: 0.3,
      upperEvapPattern: "",
    },
  ],

  // Dividers
  dividers: [
    {
      name: "4",
      xCoordinate: 3065.811,
      yCoordinate: 9036.918,
      description: "",
      tag: "",
      inflows: "NO",
      treatment: "NO",
      invertEl: 0,
      maxDepth: 0,
      initialDepth: 0,
      surchargeDepth: 0,
      pendedArea: 0,
      divertedLink: "*",
      type: "CUTOFF",
      cutoffDivider: {
        cutoffFlow: 0,
        tabularDivider: {
          curveName: "*",
        },
      },
      weirDivider: {
        minFlow: 0,
        maxDepth: 0,
        coefficient: 0,
      },
    },
  ],

  // Pollutants
  pollutants: [
    {
      name: "",
      units: "MG/L",
      rainConcen: 0.0,
      gwConcen: 0.0,
      iAndIConcen: 0.0,
      dwfConcen: 0.0,
      initConcen: 0.0,
      decayCoeff: 0.0,
      snowOnly: "NO",
      coPollutant: "",
      coFraction: "",
    },
  ],

  // Pumps
  pumps: [
    {
      name: "2",
      inletNode: "2",
      outletNode: "4",
      description: "",
      tag: "",
      pumpCurve: "*",
      initialStatus: "ON",
      startupDepth: 0,
      shutoffDepth: 0,
    },
  ],

  // Storage Units
  storageUnits: [
    {
      name: "5",
      xCoordinate: 5280.264,
      yCoordinate: 9382.599,
      description: "",
      tag: "",
      inflows: "NO",
      treatment: "NO",
      invertEl: 0,
      maxDepth: 0,
      initialDepth: 0,
      surchargeDepth: 0,
      evapFactor: 0,
      seepageLoss: "NO",
      storageShape: "FUNCTIONAL",
    },
  ],

  // Weirs
  weirs: [
    {
      name: "4",
      inletNode: "2",
      outletNode: "4",
      description: "",
      tag: "",
      type: "TRANSVERSE",
      height: 1,
      length: 1,
      sideSlope: 0,
      inletOffset: 0,
      dischargeCoeff: 3.33,
      flapGate: "NO",
      endContractions: 0,
      endSurcharge: 0,
      canSurcharge: "YES",
      coeffCurve: "",
      roadwayWeir: "",
      roadWidth: 0,
      roadSurface: "PAVED",
    },
  ],
  simulationOptions: {
    // Dates Tab
    dates: {
      startAnalysis: {
        date: "04/29/2026",
        time: "00:00",
      },
      startReporting: {
        date: "04/29/2026",
        time: "00:00",
      },
      endAnalysis: {
        date: "04/29/2026",
        time: "06:00",
      },
      startSweeping: "01/01",
      endSweeping: "12/31",
      antecedentDryDays: 0,
    },

    // Time Steps Tab
    timeSteps: {
      inertialTerms: "Dampen",
      normalFlowCriterion: "Slope & Froude",
      forceMainEquation: "Hazen-Williams",
      surchargeMethod: "Extran",
      useVariableTimeSteps: true,
      variableTimeStepAdjustment: 75, // %
      minVariableTimeStep: 0.5, // sec
      timeStepForConduitLengthening: 0, // sec
      minNodalSurfaceArea: 12.566, // sq. feet
      headConvergenceTolerance: 0.005, // feet
      maxTrialsPerTimeStep: 8,
      numParallelThreads: 1,
    },

    // Dynamic Wave Tab
    dynamicWave: {
      processModels: {
        rainfallRunoff: true,
        rainfallDependentIandI: false,
        snowMelt: false,
        groundwater: false,
        flowRouting: true,
        waterQuality: false,
      },
      infiltrationModel: "Curve Number",
      routingModel: "Dynamic Wave",
      routingOptions: {
        allowPonding: true,
        minConduitSlope: 0, // %
      },
    },

    // Files Tab
    files: {
      reportingStep: {
        days: 0,
        time: "00:15:00", // Hr:Min:Sec
      },
      runoffStepDryWeather: {
        days: 0,
        time: "01:00:00",
      },
      runoffStepWetWeather: {
        days: 0,
        time: "00:05:00",
      },
      controlRuleStep: {
        days: 0,
        time: "00:00:00",
      },
      routingStepSeconds: 20,
      skipSteadyFlowPeriods: false,
      systemFlowTolerance: 5, // %
      lateralFlowTolerance: 5, // %
    },
  },
  // Unit Hydrograph Editor
  unitHydrographs: [
    {
      nameOfUHGroup: "",
      rainGageUsed: "1",
      hydrographsFor: "January",
      unitHydrographs: [
        {
          response: "Short-Term",
          r: "", // fraction of rainfall that becomes I&I
          t: "", // time to hydrograph peak (hours)
          k: "", // falling limb duration / rising limb duration
        },
        {
          response: "Medium-Term",
          r: "",
          t: "",
          k: "",
        },
        {
          response: "Long-Term",
          r: "",
          t: "",
          k: "",
        },
      ],
    },
  ],

  // Land Use Editor
  landUses: [
    {
      general: {
        landUseName: "",
        description: "",
      },
      buildup: {},
      washoff: {
        streetSweeping: {
          interval: 0,
          availability: 0,
          lastSwept: 0,
        },
      },
    },
  ],

  // Orifice Editor
  orifices: [
    {
      name: "3",
      inletNode: "3",
      outletNode: "2",
      description: "",
      tag: "",
      type: "SIDE",
      shape: "CIRCULAR",
      height: 1,
      width: 1,
      inletOffset: 0,
      dischargeCoeff: 0.65,
      flapGate: "NO",
      timeToOpenClose: 0,
    },
  ],

  // Transect Editor
  transects: [
    {
      transectName: "",
      description: "",
      stations: [
        { station: 1, elevation: "" },
        { station: 2, elevation: "" },
        { station: 3, elevation: "" },
        { station: 4, elevation: "" },
        { station: 5, elevation: "" },
        { station: 6, elevation: "" },
        { station: 7, elevation: "" },
        { station: 8, elevation: "" },
        { station: 9, elevation: "" },
        { station: 10, elevation: "" },
        { station: 11, elevation: "" },
        { station: 12, elevation: "" },
        { station: 13, elevation: "" },
      ],
      roughness: {
        leftBank: 0.01,
        rightBank: 0.01,
        channel: 0.01,
      },
      bankStations: {
        left: 0.0,
        right: 0.0,
      },
      modifiers: {
        stations: 0.0,
        elevations: 0.0,
        meander: 0.0,
      },
    },
  ],
  // Outfalls
  outfalls: [
    {
      name: "3",
      xCoordinate: -3226.324,
      yCoordinate: 5120.385,
      description: "",
      tag: "",
      inflows: "NO",
      treatment: "NO",
      invertEl: 0,
      tideGate: "NO",
      routeTo: "",
      type: "FREE",
      fixedOutfall: "",
      fixedStage: 0,
      tidalOutfall: "",
      curveName: "*",
      timeSeriesOutfall: "",
      seriesName: "*",
    },
  ],
  // Junctions
  junctions: [
    {
      name: "2",
      xCoordinate: -2487.961,
      yCoordinate: 6757.624,
      description: "",
      tag: "",
      inflows: "NO",
      treatment: "NO",
      invertEl: 0,
      maxDepth: 0,
      initialDepth: 0,
      surchargeDepth: 0,
      pendedArea: 0,
    },
  ],
}
