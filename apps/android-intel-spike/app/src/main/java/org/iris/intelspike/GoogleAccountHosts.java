package org.iris.intelspike;

import java.util.Set;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashSet;

/**
 * Exact account hosts derived from https://www.google.com/supported_domains.
 * Verified 2026-10-21; source SHA-256: ba827017007f54b698de62a5e3bb290327c12ddc0f9c88503511725c0baf3c49.
 * Snapshot of Google-owned domains; individual regional account flows are not all device-tested.
 * Refresh from that source deliberately; never download or broaden this policy at runtime.
 */
final class GoogleAccountHosts {
    private GoogleAccountHosts() {}

    static final Set<String> HOSTS = Collections.unmodifiableSet(new HashSet<>(Arrays.asList(
            "accounts.google.ad", "accounts.google.ae", "accounts.google.al",
            "accounts.google.am", "accounts.google.as", "accounts.google.at",
            "accounts.google.az", "accounts.google.ba", "accounts.google.be",
            "accounts.google.bf", "accounts.google.bg", "accounts.google.bi",
            "accounts.google.bj", "accounts.google.bs", "accounts.google.bt",
            "accounts.google.by", "accounts.google.ca", "accounts.google.cat",
            "accounts.google.cd", "accounts.google.cf", "accounts.google.cg",
            "accounts.google.ch", "accounts.google.ci", "accounts.google.cl",
            "accounts.google.cm", "accounts.google.cn", "accounts.google.co.ao",
            "accounts.google.co.bw", "accounts.google.co.ck", "accounts.google.co.cr",
            "accounts.google.co.id", "accounts.google.co.il", "accounts.google.co.in",
            "accounts.google.co.jp", "accounts.google.co.ke", "accounts.google.co.kr",
            "accounts.google.co.ls", "accounts.google.co.ma", "accounts.google.co.mz",
            "accounts.google.co.nz", "accounts.google.co.th", "accounts.google.co.tz",
            "accounts.google.co.ug", "accounts.google.co.uk", "accounts.google.co.uz",
            "accounts.google.co.ve", "accounts.google.co.vi", "accounts.google.co.za",
            "accounts.google.co.zm", "accounts.google.co.zw", "accounts.google.com",
            "accounts.google.com.af", "accounts.google.com.ag", "accounts.google.com.ar",
            "accounts.google.com.au", "accounts.google.com.bd", "accounts.google.com.bh",
            "accounts.google.com.bn", "accounts.google.com.bo", "accounts.google.com.br",
            "accounts.google.com.bz", "accounts.google.com.co", "accounts.google.com.cu",
            "accounts.google.com.cy", "accounts.google.com.do", "accounts.google.com.ec",
            "accounts.google.com.eg", "accounts.google.com.et", "accounts.google.com.fj",
            "accounts.google.com.gh", "accounts.google.com.gi", "accounts.google.com.gt",
            "accounts.google.com.hk", "accounts.google.com.jm", "accounts.google.com.kh",
            "accounts.google.com.kw", "accounts.google.com.lb", "accounts.google.com.ly",
            "accounts.google.com.mm", "accounts.google.com.mt", "accounts.google.com.mx",
            "accounts.google.com.my", "accounts.google.com.na", "accounts.google.com.ng",
            "accounts.google.com.ni", "accounts.google.com.np", "accounts.google.com.om",
            "accounts.google.com.pa", "accounts.google.com.pe", "accounts.google.com.pg",
            "accounts.google.com.ph", "accounts.google.com.pk", "accounts.google.com.pr",
            "accounts.google.com.py", "accounts.google.com.qa", "accounts.google.com.sa",
            "accounts.google.com.sb", "accounts.google.com.sg", "accounts.google.com.sl",
            "accounts.google.com.sv", "accounts.google.com.tj", "accounts.google.com.tr",
            "accounts.google.com.tw", "accounts.google.com.ua", "accounts.google.com.uy",
            "accounts.google.com.vc", "accounts.google.com.vn", "accounts.google.cv",
            "accounts.google.cz", "accounts.google.de", "accounts.google.dj",
            "accounts.google.dk", "accounts.google.dm", "accounts.google.dz",
            "accounts.google.ee", "accounts.google.es", "accounts.google.fi",
            "accounts.google.fm", "accounts.google.fr", "accounts.google.ga",
            "accounts.google.ge", "accounts.google.gg", "accounts.google.gl",
            "accounts.google.gm", "accounts.google.gr", "accounts.google.gy",
            "accounts.google.hn", "accounts.google.hr", "accounts.google.ht",
            "accounts.google.hu", "accounts.google.ie", "accounts.google.im",
            "accounts.google.iq", "accounts.google.is", "accounts.google.it",
            "accounts.google.je", "accounts.google.jo", "accounts.google.kg",
            "accounts.google.ki", "accounts.google.kz", "accounts.google.la",
            "accounts.google.li", "accounts.google.lk", "accounts.google.lt",
            "accounts.google.lu", "accounts.google.lv", "accounts.google.md",
            "accounts.google.me", "accounts.google.mg", "accounts.google.mk",
            "accounts.google.ml", "accounts.google.mn", "accounts.google.mu",
            "accounts.google.mv", "accounts.google.mw", "accounts.google.ne",
            "accounts.google.nl", "accounts.google.no", "accounts.google.nr",
            "accounts.google.nu", "accounts.google.pl", "accounts.google.pn",
            "accounts.google.ps", "accounts.google.pt", "accounts.google.ro",
            "accounts.google.rs", "accounts.google.ru", "accounts.google.rw",
            "accounts.google.sc", "accounts.google.se", "accounts.google.sh",
            "accounts.google.si", "accounts.google.sk", "accounts.google.sm",
            "accounts.google.sn", "accounts.google.so", "accounts.google.sr",
            "accounts.google.st", "accounts.google.td", "accounts.google.tg",
            "accounts.google.tl", "accounts.google.tm", "accounts.google.tn",
            "accounts.google.to", "accounts.google.tt", "accounts.google.vu",
            "accounts.google.ws"
    )));
}
