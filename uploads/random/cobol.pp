IDENTIFICATION DIVISION.
       PROGRAM-ID. SYSCONFIG.
       AUTHOR. SYSTEM-ADMIN.
       
       ENVIRONMENT DIVISION.
       CONFIGURATION SECTION.
       SOURCE-COMPUTER. MAINFRAME.
       OBJECT-COMPUTER. MAINFRAME.
       
       INPUT-OUTPUT SECTION.
       FILE-CONTROL.
           SELECT CONFIG-FILE ASSIGN TO 'SYSCONFIG.DAT'
           ORGANIZATION IS LINE SEQUENTIAL.
           
           SELECT REPORT-FILE ASSIGN TO 'CONFIGREPORT.TXT'
           ORGANIZATION IS LINE SEQUENTIAL.
       
       DATA DIVISION.
       FILE SECTION.
       FD CONFIG-FILE.
       01 CONFIG-RECORD.
          05 SERVER-NAME         PIC X(20).
          05 SERVER-TYPE         PIC X(10).
          05 OS-VERSION          PIC X(15).
          05 MEMORY-SIZE         PIC 9(4).
          05 DISK-SPACE          PIC 9(4).
          05 APPLICATION-CODE    PIC X(5).
          05 STATUS-FLAG         PIC X.
             88 ACTIVE           VALUE 'A'.
             88 MAINTENANCE      VALUE 'M'.
             88 DECOMMISSIONED   VALUE 'D'.
             
       FD REPORT-FILE.
       01 REPORT-LINE            PIC X(132).
       
       WORKING-STORAGE SECTION.
       01 WS-EOF-FLAG            PIC X VALUE 'N'.
          88 END-OF-FILE         VALUE 'Y'.
          
       01 WS-COUNTERS.
          05 ACTIVE-SERVERS      PIC 9(3) VALUE ZERO.
          05 MAINTENANCE-SERVERS PIC 9(3) VALUE ZERO.
          05 DECOM-SERVERS       PIC 9(3) VALUE ZERO.
          
       01 WS-REPORT-HEADER.
          05 FILLER              PIC X(20) VALUE 'SERVER CONFIGURATION '.
          05 FILLER              PIC X(10) VALUE 'REPORT    '.
          05 REPORT-DATE         PIC X(10).
          
       01 WS-COLUMN-HEADERS.
          05 FILLER              PIC X(20) VALUE 'SERVER NAME         '.
          05 FILLER              PIC X(10) VALUE 'TYPE      '.
          05 FILLER              PIC X(15) VALUE 'OS VERSION     '.
          05 FILLER              PIC X(10) VALUE 'MEMORY(GB)'.
          05 FILLER              PIC X(10) VALUE 'DISK(TB)  '.
          05 FILLER              PIC X(10) VALUE 'APP CODE  '.
          05 FILLER              PIC X(10) VALUE 'STATUS    '.
          
       01 WS-DETAIL-LINE.
          05 WS-DL-SERVER-NAME   PIC X(20).
          05 WS-DL-SERVER-TYPE   PIC X(10).
          05 WS-DL-OS-VERSION    PIC X(15).
          05 WS-DL-MEMORY        PIC Z,ZZ9.
          05 FILLER              PIC X(5) VALUE SPACES.
          05 WS-DL-DISK          PIC Z,ZZ9.
          05 FILLER              PIC X(5) VALUE SPACES.
          05 WS-DL-APP-CODE      PIC X(5).
          05 FILLER              PIC X(5) VALUE SPACES.
          05 WS-DL-STATUS        PIC X(12).
          
       01 WS-SUMMARY-LINE.
          05 FILLER              PIC X(25) VALUE 'TOTAL ACTIVE SERVERS: '.
          05 WS-SL-ACTIVE        PIC ZZ9.
          05 FILLER              PIC X(25) VALUE '  MAINTENANCE SERVERS: '.
          05 WS-SL-MAINTENANCE   PIC ZZ9.
          05 FILLER              PIC X(25) VALUE '  DECOMMISSIONED: '.
          05 WS-SL-DECOM         PIC ZZ9.
          
       PROCEDURE DIVISION.
       000-MAIN-PARA.
           PERFORM 100-INITIALIZATION.
           PERFORM 200-PROCESS-RECORDS UNTIL END-OF-FILE.
           PERFORM 300-FINALIZATION.
           STOP RUN.
           
       100-INITIALIZATION.
           OPEN INPUT CONFIG-FILE.
           OPEN OUTPUT REPORT-FILE.
           
           MOVE FUNCTION CURRENT-DATE(1:10) TO REPORT-DATE.
           WRITE REPORT-LINE FROM WS-REPORT-HEADER.
           MOVE SPACES TO REPORT-LINE.
           WRITE REPORT-LINE.
           WRITE REPORT-LINE FROM WS-COLUMN-HEADERS.
           MOVE SPACES TO REPORT-LINE.
           WRITE REPORT-LINE.
           
           READ CONFIG-FILE
               AT END MOVE 'Y' TO WS-EOF-FLAG
           END-READ.
           
       200-PROCESS-RECORDS.
           MOVE SERVER-NAME TO WS-DL-SERVER-NAME.
           MOVE SERVER-TYPE TO WS-DL-SERVER-TYPE.
           MOVE OS-VERSION TO WS-DL-OS-VERSION.
           MOVE MEMORY-SIZE TO WS-DL-MEMORY.
           MOVE DISK-SPACE TO WS-DL-DISK.
           MOVE APPLICATION-CODE TO WS-DL-APP-CODE.
           
           EVALUATE TRUE
               WHEN ACTIVE
                   MOVE 'ACTIVE' TO WS-DL-STATUS
                   ADD 1 TO ACTIVE-SERVERS
               WHEN MAINTENANCE
                   MOVE 'MAINTENANCE' TO WS-DL-STATUS
                   ADD 1 TO MAINTENANCE-SERVERS
               WHEN DECOMMISSIONED
                   MOVE 'DECOMMISSIONED' TO WS-DL-STATUS
                   ADD 1 TO DECOM-SERVERS
               WHEN OTHER
                   MOVE 'UNKNOWN' TO WS-DL-STATUS
           END-EVALUATE.
           
           WRITE REPORT-LINE FROM WS-DETAIL-LINE.
           
           READ CONFIG-FILE
               AT END MOVE 'Y' TO WS-EOF-FLAG
           END-READ.
           
       300-FINALIZATION.
           MOVE SPACES TO REPORT-LINE.
           WRITE REPORT-LINE.
           
           MOVE ACTIVE-SERVERS TO WS-SL-ACTIVE.
           MOVE MAINTENANCE-SERVERS TO WS-SL-MAINTENANCE.
           MOVE DECOM-SERVERS TO WS-SL-DECOM.
           WRITE REPORT-LINE FROM WS-SUMMARY-LINE.
           
           CLOSE CONFIG-FILE, REPORT-FILE.