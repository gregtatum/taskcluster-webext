// @ts-check

/**
 * @typedef {number} IndexIntoStringTable
 */

/**
 * This is taken from the profiler.
 */
class UniqueStringArray {
  /**
   * @type {string[]}
   */
  _array;

  /**
   * @type {Map<string, IndexIntoStringTable>}
   */
  _stringToIndex;

  /**
   * @param {string[]} originalArray
   */
  constructor(originalArray = []) {
    this._array = originalArray.slice(0);
    this._stringToIndex = new Map();
    for (let i = 0; i < originalArray.length; i++) {
      this._stringToIndex.set(originalArray[i], i);
    }
  }

  /**
   * @param {IndexIntoStringTable} index
   * @param {string} [els]
   * @returns {string}
   */
  getString(index, els) {
    if (!this.hasIndex(index)) {
      if (els) {
        console.warn(`index ${index} not in UniqueStringArray`);
        return els;
      }
      throw new Error(`index ${index} not in UniqueStringArray`);
    }
    return this._array[index];
  }

  /**
   * @param {IndexIntoStringTable} i
   * @returns {boolean}
   */
  hasIndex(i) {
    return i in this._array;
  }

  /**
   * @param {string} s
   * @returns {boolean}
   */
  hasString(s) {
    return this._stringToIndex.has(s);
  }

  /**
   * @param {string} s
   * @returns {IndexIntoStringTable} s
   */
  indexForString(s) {
    let index = this._stringToIndex.get(s);
    if (index === undefined) {
      index = this._array.length;
      this._stringToIndex.set(s, index);
      this._array.push(s);
    }
    return index;
  }

  /**
   * @returns {string[]}
   */
  serializeToArray() {
    return this._array.slice(0);
  }
}

/**
 * @typedef {ReturnType<getEmptyThread>} Thread
 */

/**
 * @typedef {ReturnType<getEmptyProfile>} Profile
 */

/**
 * @typedef {Object} MarkerPayload
 */

/**
 * Returns an empty thread for the profiler.
 * See: https://github.com/firefox-devtools/profiler/blob/c60370e8c34c14b773d68959622f82bdcf1701ff/src/types/profile.js#L619
 */
function getEmptyThread() {
  return {
    processType: 'default',
    processName: 'Taskcluster',
    processStartupTime: 0,
    /** @type {number | null} */
    processShutdownTime: null,
    registerTime: 0,
    /**
     * @type {null | number}
     */
    unregisterTime: null,
    pausedRanges: [],
    name: '',
    isMainThread: false,
    pid: 0,
    tid: 0,
    samples: {
      weightType: 'samples',
      weight: null,
      /** @type {number[]} */
      stack: [],
      /** @type {number[]} */
      time: [],
      length: 0,
    },
    markers: {
      /** @type {Object[]} */
      data: [],

      /**
       * Index into the string table.
       * @type {number[]}
       */
      name: [],

      /** @type {Array<number | null>} */
      startTime: [],

      /** @type {Array<number | null>} */
      endTime: [],

      /**
       *  enum class MarkerPhase : int {
       *    Instant = 0,
       *    Interval = 1,
       *    IntervalStart = 2,
       *    IntervalEnd = 3,
       *  };
       *
       * @type {Array<0 | 1 | 2 | 3>}
       */
      phase: [],

      /**
       * IndexIntoCategoryList
       * @type {number[]}
       */
      category: [],

      length: 0,
    },
    stackTable: {
      frame: [0],
      prefix: [null],
      category: [0],
      subcategory: [0],
      length: 1,
    },
    frameTable: {
      address: [-1],
      inlineDepth: [0],
      category: [null],
      subcategory: [0],
      func: [0],
      nativeSymbol: [null],
      innerWindowID: [0],
      implementation: [null],
      line: [null],
      column: [null],
      length: 1,
    },
    funcTable: {
      isJS: [false],
      relevantForJS: [false],
      name: [0],
      resource: [-1],
      fileName: [null],
      lineNumber: [null],
      columnNumber: [null],
      length: 1,
    },
    resourceTable: {
      lib: [],
      name: [],
      host: [],
      type: [],
      length: 0,
    },
    nativeSymbols: {
      libIndex: [],
      address: [],
      name: [],
      functionSize: [],
      length: 0,
    },

    /** @type {string[]} */
    stringArray: [],
  };
}

function getEmptyProfile() {
  return {
    meta: {
      interval: 1,
      startTime: 0,
      processType: 0,
      product: 'Taskcluster',
      stackwalk: 0,
      version: 27,
      preprocessedProfileVersion: 47,
      physicalCPUs: 0,
      logicalCPUs: 0,
      symbolicationNotSupported: true,
      usesOnlyOneStackType: true,
      markerSchema: [getMarkerSchema()],
    },
    libs: [],
    /**
     * @type {Thread[]}
     */
    threads: [],
    counters: [],
  };
}

function getMarkerSchema() {
  return {
    name: 'Task',
    tooltipLabel: '{marker.data.name}',
    tableLabel: '{marker.data.name}',
    chartLabel: '{marker.data.name}',
    display: ['marker-chart', 'marker-table'],
    data: [
      {
        key: 'startTime',
        label: 'Start time',
        format: 'string',
      },
      {
        key: 'name',
        label: 'Task Name',
        format: 'string',
        searchable: true,
      },
      {
        key: 'owner',
        label: 'Owner',
        format: 'string',
      },
      {
        key: 'description',
        label: 'Description',
        format: 'url',
      },
      {
        key: 'url',
        label: 'Task URL',
        format: 'url',
      },
      {
        key: 'source',
        label: 'Source URL',
        format: 'url',
      },
      {
        key: 'taskGroup',
        label: 'Task Group URL',
        format: 'url',
      },
    ],
  };
}

/**
 * @param {TaskGroup[]} taskGroups
 * @param {URL} url
 * @returns {any}
 */
export function getProfile(taskGroups, url) {
  const profile = getEmptyProfile();

  let profileStartTime = Infinity;

  // Compute the start and end of each task group.
  const taskGroupTimeRanges = taskGroups.map((taskGroup) => {
    /** @type {null | number} */
    let start = null;
    /** @type {null | number} */
    let end = null;

    for (const { status } of taskGroup.tasks) {
      const { runs } = status;
      if (runs) {
        for (const run of runs) {
          const started = new Date(run.started).valueOf();
          const resolved = new Date(run.resolved).valueOf();
          if (start === null) {
            start = started;
          } else {
            start = Math.min(start, started);
          }
          if (end === null) {
            end = resolved;
          } else {
            end = Math.max(end, resolved);
          }
        }
      }
    }
    if (start !== null) {
      profileStartTime = Math.min(profileStartTime, start);
    }
    return { start, end };
  });

  if (profileStartTime === Infinity) {
    // No start time was determined, as there were no runs yet with a start time.
    profileStartTime = 0;
  }

  {
    const ids = taskGroups.map((taskGroup) => taskGroup.taskGroupId).join(', ');
    const date = new Date(profileStartTime).toLocaleDateString();
    profile.meta.product = `Task Group ${ids} - ${date}`;
  }

  profile.meta.startTime = profileStartTime;

  // These should be unique per thread.
  let tid = 0;
  let pid = 0;

  // Create a "thread" for every task group.
  profile.threads = taskGroups.map((taskGroup, i) => {
    const stringArray = new UniqueStringArray();
    const taskGroupTimeRange = taskGroupTimeRanges[i];

    // Sort of the tasks by their start time.
    const sortedTasks = taskGroup.tasks.map((task) => {
      const { runs } = task.status;
      if (!runs || !runs.length || !runs[0].started) {
        return { task, start: null };
      }
      return {
        task,
        start: new Date(runs[0].started).valueOf(),
      };
    });

    sortedTasks.sort((ta, tb) => {
      if (!ta.start) {
        return -1;
      }
      if (!tb.start) {
        return 1;
      }
      return ta.start - tb.start;
    });

    const thread = getEmptyThread();
    profile.threads.push(thread);
    thread.isMainThread = true;
    thread.name = taskGroup.taskGroupId;
    thread.tid = tid++;
    thread.pid = pid++;
    const markers = thread.markers;

    if (taskGroupTimeRange.start !== null) {
      thread.registerTime = taskGroupTimeRange.start - profileStartTime;
    } else {
      // Fake an empty thread by register and unregistering it outside the time range.
      thread.registerTime = -1;
      thread.unregisterTime = -1;
    }
    if (taskGroupTimeRange.end !== null) {
      thread.unregisterTime = taskGroupTimeRange.end - profileStartTime;
    }

    // Add the tasks as markers.
    if (taskGroupTimeRange.start !== null) {
      for (const { task } of sortedTasks) {
        if (!task.status.runs) {
          continue;
        }
        for (const run of task.status.runs) {
          const runStart = run.started ? new Date(run.started).valueOf() : null;
          const runEnd = run.resolved ? new Date(run.resolved).valueOf() : null;
          const durationMarker = 1;
          const instantMarker = 2;
          if (runStart === null) {
            // There is nothing to graph here.
            continue;
          } else {
            markers.startTime.push(runStart - profileStartTime);
          }
          if (runEnd === null) {
            markers.endTime.push(null);
            markers.phase.push(instantMarker);
          } else {
            markers.endTime.push(runEnd - profileStartTime);
            markers.phase.push(durationMarker);
          }

          markers.category.push(0);
          markers.name.push(stringArray.indexForString(`Task (${run.state})`));
          // markers.name.push(stringArray.indexForString(`Task`));

          markers.data.push({
            type: 'Task',
            startTime: new Date(
              profile.meta.startTime + profileStartTime,
            ).toLocaleTimeString(),
            name: task.task.metadata.name,
            url: `https://${url.host}/tasks/${task.task.taskGroupId}`,
            owner: task.task.metadata.owner,
            description: task.task.metadata.description,
            source: task.task.metadata.source,
            taskGroup: url.href,
          });

          markers.length++;
        }
      }
    }

    thread.stringArray = stringArray.serializeToArray();

    return thread;
  });

  console.log('Generated profile:', profile);
  return profile;
}
